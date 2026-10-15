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
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0.7
  bins = new Uint8Array(analyser.frequencyBinCount)
  src.connect(analyser).connect(ctx.destination)
  graph.ctx = ctx
}

let bassAvg = 0

// ---- tempo ----
// Bass onsets (sudden rises in low-end energy) are timestamped; every
// second their intervals are folded into 80-160 BPM and voted into a
// histogram, and the peak becomes the tempo. The latest onset anchors
// the beat phase so visuals land on the beat, not just at the right rate.
let prevBass = 0
let fluxAvg = 0
let lastOnset = 0
const onsets = []
let bpm = 0
let beatAt = 0
let lastEstimate = 0

function detectOnset(bass) {
  const now = performance.now()
  const flux = Math.max(0, bass - prevBass)
  prevBass = bass
  fluxAvg += (flux - fluxAvg) * 0.05
  if (flux > fluxAvg * 2.2 + 0.015 && now - lastOnset > 260) {
    lastOnset = now
    onsets.push(now)
    while (onsets.length && now - onsets[0] > 12000) onsets.shift()
  }
  if (now - lastEstimate > 1000 && onsets.length > 6) {
    lastEstimate = now
    const votes = new Float32Array(81) // 80..160
    for (let i = 0; i < onsets.length; i++)
      for (let j = i + 1; j < onsets.length && onsets[j] - onsets[i] < 2600; j++) {
        let b = 60000 / (onsets[j] - onsets[i])
        while (b < 80) b *= 2
        while (b > 160) b /= 2
        for (let d = -2; d <= 2; d++) {
          const k = Math.round(b) - 80 + d
          if (k >= 0 && k <= 80) votes[k] += Math.exp(-(d * d) / 2)
        }
      }
    let best = 0
    for (let k = 1; k <= 80; k++) if (votes[k] > votes[best]) best = k
    const found = best + 80
    bpm = bpm ? bpm + (found - bpm) * 0.3 : found
    beatAt = lastOnset
  }
}

// { bpm, phase } where phase runs 0..1 between beats (0 = on the beat)
export function musicTempo() {
  if (!bpm || audio.paused) return { bpm: 0, phase: 0 }
  const period = 60000 / bpm
  return { bpm: Math.round(bpm), phase: (((performance.now() - beatAt) % period) + period) % period / period }
}

let beat = 0
let low = 0
let high = 0

// Two readings of the song for the wave:
//   level: loudness envelope, quick to rise, eases back down
//   beat:  a kick when the bass jumps above its running average, decays fast
export function musicLevel() {
  if (!analyser || audio.paused) {
    level *= 0.95
    beat *= 0.85
    low *= 0.95
    high *= 0.95
    return { level, beat, low, high }
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
  if (bass > bassAvg * 1.12 && bass > 0.3) beat = Math.min(1, beat + (bass - bassAvg) * 7)
  bassAvg += (bass - bassAvg) * 0.06
  detectOnset(bass)
  beat *= 0.86

  // band energies: lows (bins 1-8, roughly under 700Hz at 44.1k/512)
  // and mids+highs (the rest of the audible spread)
  const band = (a, b) => {
    let e = 0
    for (let i = a; i < b; i++) e += bins[i]
    return e / ((b - a) * 255)
  }
  const lt = Math.min(1, Math.max(0, (band(1, 8) - 0.25) / 0.5))
  const ht = Math.min(1, Math.max(0, (band(8, 120) - 0.08) / 0.35))
  low += (lt - low) * (lt > low ? 0.45 : 0.12)
  high += (ht - high) * (ht > high ? 0.5 : 0.15)
  return { level, beat, low, high }
}

// A real spectrum laid along the wave. Each ribbon gets a frequency range;
// its samples run left to right across that range on a log scale (like
// hearing it), smoothed in time (rise faster than fall) and across
// neighbours so the line flows instead of jittering.
const specCache = new Map()
export function spectrum(key, samples, lo, hi) {
  let s = specCache.get(key)
  if (!s) specCache.set(key, (s = new Float32Array(samples + 1)))
  const live = analyser && !audio.paused
  for (let i = 0; i <= samples; i++) {
    let v = 0
    if (live) {
      // log-spaced bin for this x, read with linear interpolation
      const f = lo * Math.pow(hi / lo, i / samples)
      const b0 = Math.floor(f)
      const fr = f - b0
      v = ((bins[b0] ?? 0) * (1 - fr) + (bins[b0 + 1] ?? 0) * fr) / 255
      v = Math.max(0, (v - 0.18) / 0.82) // ignore the noise floor
    }
    s[i] += (v - s[i]) * (v > s[i] ? 0.12 : 0.05)
  }
  // spatial smoothing, two light passes
  for (let pass = 0; pass < 2; pass++)
    for (let i = 1; i < samples; i++) s[i] = (s[i - 1] + 2 * s[i] + s[i + 1]) / 4
  return s
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
let volTarget = 1
let duck = 1 // drops while scrubbing so jumps don't blare
let ramping = false

// glide audio.volume to its target instead of stepping it
function rampVolume() {
  if (ramping) return
  ramping = true
  const step = () => {
    const goal = volTarget * duck
    const v = audio.volume + (goal - audio.volume) * 0.25
    audio.volume = Math.abs(goal - v) < 0.003 ? goal : v
    if (audio.volume !== goal) requestAnimationFrame(step)
    else ramping = false
  }
  requestAnimationFrame(step)
}

// Scrubbing: the song keeps playing from wherever the knob drops it,
// ducked, like dragging a tape past the head. Seeks are coalesced to one
// per frame so fast turns never queue up.
let seekTo = null
export function seek(t) {
  const first = seekTo === null
  seekTo = t
  if (!first) return
  requestAnimationFrame(() => {
    if (seekTo === null) return
    audio.currentTime = seekTo
    setState({ position: Math.floor(seekTo) })
    seekTo = null
  })
}
export function setScrubbing(on) {
  duck = on ? 0.4 : 1
  rampVolume()
}
function sync() {
  const s = getState()
  const t = TRACKS[s.track]
  if (!t) return
  if (loaded !== s.track) {
    loaded = s.track
    bpm = 0
    onsets.length = 0
    audio.src = t.src
    audio.currentTime = s.position || 0
  } else if (Math.abs(audio.currentTime - s.position) > 2) {
    audio.currentTime = s.position // a seek from the UI (e.g. previous restarts)
  }
  volTarget = Math.pow(s.volume / 100, 1.6)
  rampVolume()
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
