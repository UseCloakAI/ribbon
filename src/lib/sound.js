// ribbon sound design.
//
// Every sound is synthesized, then pre-rendered once through an
// OfflineAudioContext into a stereo buffer: FM bells and plucks, shaped
// noise, a detuned analog-style pad, all through a stereo convolution
// reverb with early reflections and a damped tail. Playback is a single
// buffer source per sound, so it costs almost nothing on a Pi and every
// play sounds identical (with a hair of random pitch so repeats stay alive).
//
// Palette: soft glass and kalimba in G major pentatonic. Navigation is
// tiny and close; moments (startup, launch, CarPlay) open into the room.
//
// The default knob sound is queued on a microtask after each knob event.
// Any explicit sfx() in the same dispatch replaces it, so each notch makes
// exactly one sound.
import { bus } from './bus.js'
import { getState, subscribe } from './store.js'

const SR = 44100
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12)
// G major pentatonic, two octaves from G4: values and tuning snap to it
const PENTA = [67, 69, 71, 74, 76, 79, 81, 83, 86, 88, 91]

let ctx = null
let master = null
const buffers = new Map()
let renderAll = null

// ---------- shared material (context independent) ----------

let IR = null
let NOISE = null

function material() {
  if (IR) return
  // stereo room: a few early reflections, then a decorrelated tail whose
  // highs die faster than its lows
  const len = Math.floor(SR * 2.4)
  IR = new AudioBuffer({ numberOfChannels: 2, length: len, sampleRate: SR })
  for (let ch = 0; ch < 2; ch++) {
    const d = IR.getChannelData(ch)
    const early = [0.011, 0.019, 0.027, 0.041, 0.053].map((t) => t + ch * 0.003)
    early.forEach((t, i) => (d[Math.floor(t * SR)] += 0.5 / (i + 1)))
    let lp = 0
    for (let i = 0; i < len; i++) {
      const p = i / len
      const k = 0.55 - 0.45 * p // damping closes over time
      lp += k * (Math.random() * 2 - 1 - lp)
      d[i] += lp * Math.pow(1 - p, 2.6) * Math.min(1, i / (SR * 0.02)) * 0.6
    }
  }
  NOISE = new AudioBuffer({ numberOfChannels: 1, length: SR * 2, sampleRate: SR })
  const n = NOISE.getChannelData(0)
  for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1
}

// ---------- voices (built inside an offline context) ----------

function chain(oc, wetLevel) {
  const dry = oc.createGain()
  const wet = oc.createGain()
  wet.gain.value = wetLevel
  const conv = oc.createConvolver()
  conv.normalize = true
  conv.buffer = IR
  const hs = oc.createBiquadFilter() // keep the room soft
  hs.type = 'highshelf'
  hs.frequency.value = 5000
  hs.gain.value = -6
  dry.connect(oc.destination)
  wet.connect(conv).connect(hs).connect(oc.destination)
  return { dry, wet }
}

function out(oc, bus, { pan = 0, send = 0 }) {
  const p = oc.createStereoPanner()
  p.pan.value = pan
  p.connect(bus.dry)
  if (send) {
    const s = oc.createGain()
    s.gain.value = send
    p.connect(s).connect(bus.wet)
  }
  return p
}

function env(param, t, peak, attack, decay, floor = 0.0001) {
  param.setValueAtTime(floor, t)
  param.exponentialRampToValueAtTime(Math.max(peak, floor * 2), t + attack)
  param.exponentialRampToValueAtTime(floor, t + attack + decay)
}

// Two-operator FM. ratio ~1.4 / 3.5 gives glass and bell, 2 gives kalimba.
function fm(oc, bus, { t = 0, f, dur = 0.6, gain = 0.2, ratio = 1.4, index = 2.5, bright = 0.08, attack = 0.002, pan = 0, send = 0.2 }) {
  const c = oc.createOscillator()
  const a = oc.createGain()
  c.frequency.value = f
  env(a.gain, t, gain, attack, dur)
  if (index > 0) {
    const m = oc.createOscillator()
    const mg = oc.createGain()
    m.frequency.value = f * ratio
    env(mg.gain, t, index * f * ratio, 0.001, dur * bright * 6)
    m.connect(mg).connect(c.frequency)
    m.start(t)
    m.stop(t + dur + 0.1)
  }
  c.connect(a).connect(out(oc, bus, { pan, send }))
  c.start(t)
  c.stop(t + dur + 0.1)
}

// Kalimba: FM pluck plus a quiet inharmonic tine partial.
function pluck(oc, bus, o) {
  fm(oc, bus, { ratio: 2, index: 1.6, bright: 0.02, dur: 0.5, ...o })
  fm(oc, bus, { ...o, f: o.f * 5.4, index: 0, gain: (o.gain ?? 0.2) * 0.12, dur: 0.08 })
}

function noise(oc, bus, { t = 0, dur = 0.2, type = 'bandpass', from = 2000, to, q = 1, gain = 0.1, attack = 0.002, pan = 0, send = 0 }) {
  const s = oc.createBufferSource()
  s.buffer = NOISE
  const fl = oc.createBiquadFilter()
  fl.type = type
  fl.Q.value = q
  fl.frequency.setValueAtTime(from, t)
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur)
  const a = oc.createGain()
  env(a.gain, t, gain, attack, dur)
  s.connect(fl).connect(a).connect(out(oc, bus, { pan, send }))
  s.start(t, Math.random())
  s.stop(t + dur + attack + 0.05)
}

function sine(oc, bus, { t = 0, f, to, dur = 0.1, gain = 0.2, attack = 0.002, pan = 0, send = 0 }) {
  const o = oc.createOscillator()
  o.frequency.setValueAtTime(f, t)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur)
  const a = oc.createGain()
  env(a.gain, t, gain, attack, dur)
  o.connect(a).connect(out(oc, bus, { pan, send }))
  o.start(t)
  o.stop(t + dur + attack + 0.05)
}

// Warm pad: three detuned saws per note through a slowly opening lowpass.
function pad(oc, bus, { notes, t = 0, dur = 4.5, gain = 0.05, swell = 1.4, send = 0.6 }) {
  const lp = oc.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 0.9
  lp.frequency.setValueAtTime(240, t)
  lp.frequency.exponentialRampToValueAtTime(2600, t + swell + 0.8)
  lp.frequency.exponentialRampToValueAtTime(900, t + dur)
  const a = oc.createGain()
  a.gain.setValueAtTime(0.0001, t)
  a.gain.exponentialRampToValueAtTime(gain, t + swell)
  a.gain.setValueAtTime(gain, t + dur * 0.5)
  a.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  lp.connect(a)
  a.connect(out(oc, bus, { pan: -0.35, send }))
  a.connect(out(oc, bus, { pan: 0.35, send }))
  notes.forEach((n) =>
    [-9, 0, 9].forEach((cents) => {
      const o = oc.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = hz(n)
      o.detune.value = cents + (Math.random() - 0.5) * 3
      const g = oc.createGain()
      g.gain.value = 1 / (notes.length * 3)
      o.connect(g).connect(lp)
      o.start(t)
      o.stop(t + dur + 0.1)
    }),
  )
}

// ---------- the palette: [length in seconds, reverb level, builder] ----------

const DEFS = {
  // a notch: glass tick with a whisper of body
  tick: [0.25, 0.08, (oc, b) => {
    noise(oc, b, { dur: 0.012, type: 'highpass', from: 6500, gain: 0.07 })
    fm(oc, b, { f: hz(98), ratio: 1.41, index: 1.2, bright: 0.01, dur: 0.06, gain: 0.05, send: 0.3 })
    sine(oc, b, { f: 190, dur: 0.02, gain: 0.05 })
  }],
  // end of a ring: soft felt thock
  bump: [0.35, 0.05, (oc, b) => {
    sine(oc, b, { f: 120, to: 62, dur: 0.16, gain: 0.32 })
    noise(oc, b, { dur: 0.05, type: 'lowpass', from: 420, gain: 0.12 })
  }],
  press: [0.4, 0.1, (oc, b) => {
    noise(oc, b, { dur: 0.015, type: 'highpass', from: 4000, gain: 0.06 })
    pluck(oc, b, { f: hz(79), gain: 0.07, dur: 0.18, send: 0.2 })
  }],
  enter: [1.2, 0.18, (oc, b) => {
    pluck(oc, b, { f: hz(79), gain: 0.12, pan: -0.1 })
    pluck(oc, b, { t: 0.07, f: hz(86), gain: 0.11, pan: 0.1, send: 0.35 })
  }],
  back: [1.1, 0.16, (oc, b) => {
    pluck(oc, b, { f: hz(86), gain: 0.1, pan: 0.1 })
    pluck(oc, b, { t: 0.065, f: hz(79), gain: 0.1, pan: -0.1, send: 0.3 })
  }],
  // launch: air swells as the rim fills, then a glass chord blooms
  launch: [3.2, 0.32, (oc, b) => {
    noise(oc, b, { dur: 0.62, from: 300, to: 4200, q: 1.4, gain: 0.07, attack: 0.4, send: 0.6 })
    sine(oc, b, { f: hz(43), dur: 0.9, gain: 0.08, attack: 0.5 })
    ;[67, 74, 79, 83, 86].forEach((n, i) =>
      fm(oc, b, { t: 0.58 + i * 0.028, f: hz(n), ratio: 3.5, index: 0.9, bright: 0.05, dur: 1.9, gain: 0.05, pan: (i - 2) * 0.25, send: 0.7 }),
    )
  }],
  close: [1.4, 0.22, (oc, b) => {
    noise(oc, b, { dur: 0.36, from: 3200, to: 380, q: 1.2, gain: 0.06, attack: 0.05, send: 0.4 })
    fm(oc, b, { t: 0.06, f: hz(74), ratio: 3.5, index: 0.7, dur: 0.9, gain: 0.05, send: 0.5 })
  }],
  grab: [0.9, 0.14, (oc, b) => {
    pluck(oc, b, { f: hz(72), gain: 0.09 })
    pluck(oc, b, { t: 0.05, f: hz(79), gain: 0.09, send: 0.3 })
  }],
  release: [0.9, 0.14, (oc, b) => {
    pluck(oc, b, { f: hz(79), gain: 0.08 })
    pluck(oc, b, { t: 0.05, f: hz(72), gain: 0.08, send: 0.25 })
  }],
  // a value step: rendered at A4, pitched onto the scale at play time
  value: [0.6, 0.1, (oc, b) => {
    noise(oc, b, { dur: 0.01, type: 'highpass', from: 6000, gain: 0.04 })
    pluck(oc, b, { f: hz(69), gain: 0.09, dur: 0.3, send: 0.2 })
  }],
  tune: [0.3, 0.05, (oc, b) => {
    noise(oc, b, { dur: 0.1, from: 2600, to: 1900, q: 4, gain: 0.05, attack: 0.01 })
    sine(oc, b, { f: hz(69), dur: 0.04, gain: 0.025 })
  }],
  station: [1.6, 0.25, (oc, b) => {
    fm(oc, b, { f: hz(83), ratio: 3.5, index: 0.8, dur: 0.9, gain: 0.06, send: 0.5 })
    fm(oc, b, { t: 0.08, f: hz(91), ratio: 3.5, index: 0.6, dur: 1.1, gain: 0.05, send: 0.6 })
  }],
  toggleOn: [0.8, 0.12, (oc, b) => {
    pluck(oc, b, { f: hz(79), gain: 0.08 })
    pluck(oc, b, { t: 0.05, f: hz(83), gain: 0.08, send: 0.25 })
  }],
  toggleOff: [0.8, 0.12, (oc, b) => {
    pluck(oc, b, { f: hz(83), gain: 0.07 })
    pluck(oc, b, { t: 0.05, f: hz(76), gain: 0.07, send: 0.2 })
  }],
  select: [1.2, 0.2, (oc, b) => {
    noise(oc, b, { dur: 0.012, type: 'highpass', from: 5000, gain: 0.05 })
    fm(oc, b, { f: hz(83), ratio: 3.5, index: 0.9, dur: 0.8, gain: 0.07, send: 0.45 })
  }],
  pop: [0.7, 0.18, (oc, b) => {
    sine(oc, b, { f: hz(86), to: hz(93), dur: 0.09, gain: 0.06, send: 0.3 })
  }],
  step: [0.9, 0.2, (oc, b) => {
    fm(oc, b, { f: hz(91), ratio: 3.5, index: 0.5, dur: 0.5, gain: 0.04, send: 0.5 })
  }],
  connected: [3, 0.3, (oc, b) => {
    ;[67, 71, 74, 79, 83, 86].forEach((n, i) =>
      fm(oc, b, { t: i * 0.06, f: hz(n), ratio: 3.5, index: 0.8, dur: 1.6, gain: 0.05, pan: (i - 2.5) * 0.2, send: 0.6 }),
    )
    sine(oc, b, { f: hz(43), dur: 1.2, gain: 0.07, attack: 0.02 })
  }],
  error: [1.2, 0.12, (oc, b) => {
    fm(oc, b, { f: hz(62), ratio: 1, index: 1.5, dur: 0.22, gain: 0.1 })
    fm(oc, b, { t: 0.16, f: hz(58), ratio: 1, index: 1.5, dur: 0.4, gain: 0.1, send: 0.2 })
  }],
  // startup 1: a Gmaj9 pad rises with the sky, glints drift over it
  boot: [6.5, 0.4, (oc, b) => {
    pad(oc, b, { notes: [43, 50, 59, 66, 69], dur: 5.4, gain: 0.11, swell: 1.6 })
    noise(oc, b, { t: 0.05, dur: 1.6, from: 250, to: 2600, q: 0.8, gain: 0.03, attack: 0.9, send: 0.7 })
    ;[[0.75, 91, -0.5], [1.2, 95, 0.4], [1.8, 98, -0.3], [2.4, 103, 0.5]].forEach(([t, n, pan]) =>
      fm(oc, b, { t, f: hz(n), ratio: 3.5, index: 0.5, dur: 1.4, gain: 0.018, pan, send: 0.9 }),
    )
  }],
  // startup 2: the wordmark lands
  chime: [3.4, 0.35, (oc, b) => {
    ;[79, 83, 86, 91].forEach((n, i) =>
      fm(oc, b, { t: i * 0.05, f: hz(n), ratio: 3.5, index: 1, bright: 0.04, dur: 2.2, gain: 0.05, pan: (i - 1.5) * 0.3, send: 0.6 }),
    )
  }],
  // startup 3: the circle arrives, the options fan out
  arrive: [1.6, 0.2, (oc, b) => {
    sine(oc, b, { f: hz(55), to: hz(43), dur: 0.6, gain: 0.14, attack: 0.02 })
    noise(oc, b, { dur: 0.5, from: 600, to: 2400, q: 1, gain: 0.03, attack: 0.25, send: 0.4 })
    ;[79, 83, 86, 91].forEach((n, i) => pluck(oc, b, { t: 0.4 + i * 0.07, f: hz(n), gain: 0.035, dur: 0.3, pan: -0.3 + i * 0.2, send: 0.3 }))
  }],
}

// Peak targets (dBFS) after rendering, so the palette sits at one loudness:
// the knob's constant companions quietest, the moments fullest.
const PEAK = { tick: -16, tune: -17, value: -14, press: -15, bump: -14, pop: -16, step: -16, boot: -8, chime: -10, launch: -10, connected: -10 }

function normalize(buf, dB) {
  let peak = 0
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]))
  }
  if (!peak) return
  const k = Math.pow(10, dB / 20) / peak
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < d.length; i++) d[i] *= k
  }
}

async function renderOne(name) {
  const [len, wet, build] = DEFS[name]
  const oc = new OfflineAudioContext(2, Math.ceil(len * SR), SR)
  build(oc, chain(oc, wet))
  const buf = await oc.startRendering()
  normalize(buf, PEAK[name] ?? -12)
  buffers.set(name, buf)
  waiters.get(name)?.forEach((fn) => fn())
  waiters.delete(name)
}

const waiters = new Map()
// Resolves when one sound is rendered (the startup waits on its own sound).
export function whenReady(name) {
  prerender()
  if (buffers.has(name)) return Promise.resolve()
  return new Promise((res) => {
    if (!waiters.has(name)) waiters.set(name, [])
    waiters.get(name).push(res)
  })
}

// Startup sounds first (they play before anyone can turn the knob), then navigation.
const ORDER = ['boot', 'tick', 'bump', 'press', 'chime', 'arrive', 'enter', 'back', 'value', 'launch', 'close']

function prerender() {
  if (renderAll) return renderAll
  if (!window.OfflineAudioContext) return (renderAll = Promise.resolve())
  material()
  const rest = Object.keys(DEFS).filter((n) => !ORDER.includes(n))
  renderAll = (async () => {
    for (const n of [...ORDER, ...rest]) {
      try {
        await renderOne(n)
      } catch {
        /* a failed render just leaves that sound silent */
      }
    }
  })()
  return renderAll
}

// ---------- playback ----------

function init() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC({ latencyHint: 'interactive', sampleRate: SR })
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.knee.value = 12
  comp.ratio.value = 3
  comp.attack.value = 0.002
  comp.release.value = 0.15
  comp.connect(ctx.destination)
  master = ctx.createGain()
  master.connect(comp)
  applyVolume()
  return ctx
}

function applyVolume() {
  if (!master) return
  const s = getState()
  const v = s.sounds ? Math.pow((s.uiVolume ?? 60) / 100, 1.5) * 1.1 : 0
  master.gain.setTargetAtTime(v, ctx.currentTime, 0.02)
}

let lastTick = 0
function play(name, { semis = 0, gain = 1, jitter = 0.012 } = {}) {
  if (!getState().sounds) return
  const buf = buffers.get(name)
  if (!buf || !init()) return
  if (ctx.state === 'suspended') ctx.resume()
  const src = ctx.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = Math.pow(2, semis / 12) * (1 + (Math.random() - 0.5) * jitter)
  const g = ctx.createGain()
  g.gain.value = gain
  src.connect(g).connect(master)
  src.start()
}

const snap = (f) => PENTA[Math.max(0, Math.min(PENTA.length - 1, Math.round(f * (PENTA.length - 1))))]

const PLAY = {
  tick(dir = 1) {
    const now = performance.now()
    const fast = now - lastTick < 70
    lastTick = now
    play('tick', { semis: dir > 0 ? 0 : -2, gain: fast ? 0.6 : 1, jitter: 0.04 })
  },
  value: (f = 0.5) => play('value', { semis: snap(f) - 69, jitter: 0 }),
  tune: (f = 0.5) => play('tune', { semis: snap(f) - 69 - 12, jitter: 0.02 }),
}

// ---------- public api ----------

let pending = null

export function sfx(name, arg) {
  pending = null // an explicit sound wins over the queued default
  PLAY[name] ? PLAY[name](arg) : play(name)
}

function queueDefault(name, arg) {
  const token = {}
  pending = token
  queueMicrotask(() => {
    if (pending !== token) return
    pending = null
    PLAY[name] ? PLAY[name](arg) : play(name)
  })
}

// True when the browser is holding audio until a gesture. Kiosk mode (see
// scripts/kiosk.sh) never is; a normal browser tab usually is on first load.
export function audioLocked() {
  if (!getState().sounds) return false
  const a = init()
  return !!a && a.state !== 'running'
}

let wired = false
export function wireSound() {
  if (wired) return
  wired = true
  prerender()
  bus.on('knob', (e) => {
    if (e.type === 'turn') queueDefault('tick', e.dir)
    else if (e.type === 'press') queueDefault('press')
    else if (e.type === 'back' || e.type === 'home') queueDefault('back')
  })
  bus.on('bump', () => sfx('bump'))
  bus.on('toast', () => sfx('pop'))
  subscribe(applyVolume)
  // browsers block audio until a gesture; kiosk mode lifts that
  const unlock = () => {
    init()?.resume()
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('pointerdown', unlock)
  }
  window.addEventListener('keydown', unlock)
  window.addEventListener('pointerdown', unlock)
}

// dev hook for auditioning the palette from the console: __sfx('launch')
if (import.meta.env.DEV) {
  window.__sfx = sfx
  window.__sfxBuffers = buffers
}
