// Real playback. One <audio> element follows the store (track, playing,
// position, volume) and reports time back. An analyser on it gives the wave
// a heavily smoothed loudness, so the sky moves with the song without
// twitching on every beat.
import { TRACKS } from '../data/media.js'
import { getState, setState, subscribe } from './store.js'

const audio = new Audio()
audio.preload = 'auto'
let analyser = null
let bins = null
let level = 0

function graph() {
  if (analyser) return
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  const ctx = new AC()
  const src = ctx.createMediaElementSource(audio)
  analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  analyser.smoothingTimeConstant = 0.6
  bins = new Uint8Array(analyser.frequencyBinCount)
  src.connect(analyser).connect(ctx.destination)
  graph.ctx = ctx
}

let bassAvg = 0
let beat = 0

// Two readings of the song for the wave:
//   level: loudness envelope, quick to rise, eases back down
//   beat:  a kick when the bass jumps above its running average, decays fast
export function musicLevel() {
  if (!analyser || audio.paused) {
    level *= 0.95
    beat *= 0.85
    return { level, beat }
  }
  analyser.getByteFrequencyData(bins)
  let sum = 0
  const n = Math.floor(bins.length * 0.35) // lows and mids carry the feel
  for (let i = 1; i < n; i++) sum += bins[i] * bins[i]
  const rms = Math.sqrt(sum / n) / 255
  const target = Math.min(1, Math.max(0, (rms - 0.08) / 0.4))
  level += (target - level) * (target > level ? 0.1 : 0.04)

  let bass = 0
  for (let i = 1; i < 6; i++) bass += bins[i]
  bass /= 5 * 255
  if (bass > bassAvg * 1.18 && bass > 0.35) beat = Math.min(1, beat + (bass - bassAvg) * 4)
  bassAvg += (bass - bassAvg) * 0.06
  beat *= 0.9
  return { level, beat }
}

function tryPlay() {
  graph()
  graph.ctx?.resume()
  audio.play().catch(() => {
    // blocked until a gesture: resume on the first key
    const go = () => {
      window.removeEventListener('keydown', go)
      if (getState().playing) tryPlay()
    }
    window.addEventListener('keydown', go)
  })
}

let loaded = -1
function sync() {
  const s = getState()
  const t = TRACKS[s.track]
  if (!t) return
  if (loaded !== s.track) {
    loaded = s.track
    audio.src = t.src
    audio.currentTime = s.position || 0
  } else if (Math.abs(audio.currentTime - s.position) > 2) {
    audio.currentTime = s.position // a seek from the UI (e.g. previous restarts)
  }
  audio.volume = Math.pow(s.volume / 100, 1.6)
  if (s.playing && audio.paused) tryPlay()
  if (!s.playing && !audio.paused) audio.pause()
}

export function startPlayer() {
  audio.addEventListener('timeupdate', () => {
    const p = Math.floor(audio.currentTime)
    if (p !== getState().position) setState({ position: p })
  })
  audio.addEventListener('ended', () => setState({ track: (getState().track + 1) % TRACKS.length, position: 0 }))
  audio.addEventListener('error', () => setState({ playing: false }))
  subscribe(sync)
  sync()
}
