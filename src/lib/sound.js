// ribbon sound design. Everything is synthesized with WebAudio, no files.
//
// Palette: soft sine/triangle tones in a bright major key, a short airy
// reverb, and filtered-noise "air" for movement. Navigation sounds are tiny
// and dry so they never tire; moments (startup, launch, CarPlay connected)
// get chords and the reverb tail.
//
// Default knob sounds are scheduled on a microtask after each knob event.
// Any explicit sfx() call in the same dispatch (a bump, a value change, a
// launch) replaces the default, so each notch makes exactly one sound.
import { bus } from './bus.js'
import { getState, subscribe } from './store.js'

let ctx = null
let master = null
let verb = null
let noiseBuf = null

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12) // midi to Hz

function init() {
  if (ctx) return ctx
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  ctx = new AC({ latencyHint: 'interactive' })

  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -18
  comp.ratio.value = 4
  comp.attack.value = 0.003
  comp.release.value = 0.2
  comp.connect(ctx.destination)

  master = ctx.createGain()
  master.connect(comp)

  // Generated impulse response: 1.6s of decaying stereo noise, gently darkened.
  const len = Math.floor(ctx.sampleRate * 1.6)
  const ir = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    let lp = 0
    for (let i = 0; i < len; i++) {
      lp += 0.35 * (Math.random() * 2 - 1 - lp)
      d[i] = lp * Math.pow(1 - i / len, 3.2)
    }
  }
  const conv = ctx.createConvolver()
  conv.buffer = ir
  verb = ctx.createGain()
  verb.gain.value = 0.7
  verb.connect(conv).connect(master)

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const nd = noiseBuf.getChannelData(0)
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1

  applyVolume()
  return ctx
}

function applyVolume() {
  if (!master) return
  const s = getState()
  const v = s.sounds ? Math.pow((s.uiVolume ?? 60) / 100, 1.6) : 0
  master.gain.setTargetAtTime(v * 0.9, ctx.currentTime, 0.02)
}

function ready() {
  const s = getState()
  if (!s.sounds) return null
  const a = init()
  if (!a) return null
  if (a.state === 'suspended') a.resume()
  return a
}

// ---------- primitives ----------

function tone(freq, { t = 0, dur = 0.12, type = 'sine', gain = 0.2, attack = 0.004, glide, send = 0, pan = 0 } = {}) {
  const now = ctx.currentTime + t
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, now)
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, now + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(gain, now + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  let out = g
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner()
    p.pan.value = pan
    g.connect(p)
    out = p
  }
  o.connect(g)
  out.connect(master)
  if (send) {
    const s = ctx.createGain()
    s.gain.value = send
    out.connect(s).connect(verb)
  }
  o.start(now)
  o.stop(now + dur + 0.05)
}

function air({ t = 0, dur = 0.3, from = 600, to = 3000, q = 1.2, gain = 0.12, send = 0.3 } = {}) {
  const now = ctx.currentTime + t
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = q
  f.frequency.setValueAtTime(from, now)
  f.frequency.exponentialRampToValueAtTime(to, now + dur)
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, now)
  g.gain.exponentialRampToValueAtTime(gain, now + dur * 0.45)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  src.connect(f).connect(g).connect(master)
  if (send) {
    const s = ctx.createGain()
    s.gain.value = send
    g.connect(s).connect(verb)
  }
  src.start(now, Math.random() * 0.5)
  src.stop(now + dur + 0.05)
}

function click({ t = 0, freq = 4200, gain = 0.09, dur = 0.018 } = {}) {
  const now = ctx.currentTime + t
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = 5
  const g = ctx.createGain()
  g.gain.setValueAtTime(gain, now)
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur)
  src.connect(f).connect(g).connect(master)
  src.start(now, Math.random() * 0.8)
  src.stop(now + dur + 0.02)
}

// ---------- the palette ----------

let lastTick = 0
const SOUNDS = {
  // one detent: a dry tick with a faint glassy ping, slightly varied
  tick(dir = 1) {
    const now = performance.now()
    const fast = now - lastTick < 70
    lastTick = now
    click({ freq: 3800 + Math.random() * 600, gain: fast ? 0.05 : 0.08 })
    tone(dir > 0 ? NOTE(91) : NOTE(89), { dur: 0.05, gain: fast ? 0.025 : 0.045, pan: dir * 0.15 })
  },
  // end of a ring: a soft felt thud, no pitch to it
  bump() {
    tone(150, { dur: 0.13, gain: 0.32, glide: 70, attack: 0.002 })
    click({ freq: 900, gain: 0.07, dur: 0.03 })
  },
  press() {
    click({ freq: 2400, gain: 0.07, dur: 0.02 })
    tone(NOTE(76), { dur: 0.07, gain: 0.08, glide: NOTE(74) })
  },
  // step into a ring / app list: rising fifth
  enter() {
    tone(NOTE(79), { dur: 0.12, gain: 0.1, type: 'triangle', send: 0.15 })
    tone(NOTE(86), { t: 0.06, dur: 0.2, gain: 0.09, type: 'triangle', send: 0.25 })
  },
  // step out: the same fifth, falling
  back() {
    tone(NOTE(86), { dur: 0.1, gain: 0.08, type: 'triangle', send: 0.1 })
    tone(NOTE(79), { t: 0.055, dur: 0.16, gain: 0.08, type: 'triangle', send: 0.15 })
  },
  // launch: air rushes in while the knob ring fills, then a chord blooms
  launch() {
    air({ dur: 0.62, from: 380, to: 3800, gain: 0.1, send: 0.35 })
    ;[NOTE(79), NOTE(83), NOTE(86), NOTE(91)].forEach((f, i) =>
      tone(f, { t: 0.56 + i * 0.03, dur: 1.1, gain: 0.07, attack: 0.01, send: 0.55, pan: (i - 1.5) * 0.2 }),
    )
  },
  close() {
    air({ dur: 0.34, from: 2600, to: 420, gain: 0.08, send: 0.2 })
    tone(NOTE(84), { t: 0.04, dur: 0.22, gain: 0.05, glide: NOTE(79), send: 0.2 })
  },
  // grab / let go of a value with the knob
  grab() {
    tone(NOTE(72), { dur: 0.08, gain: 0.08, type: 'triangle' })
    tone(NOTE(79), { t: 0.045, dur: 0.12, gain: 0.08, type: 'triangle', send: 0.12 })
  },
  release() {
    tone(NOTE(79), { dur: 0.08, gain: 0.07, type: 'triangle' })
    tone(NOTE(72), { t: 0.045, dur: 0.12, gain: 0.07, type: 'triangle' })
  },
  // adjusting a value: pitch follows the value, so you can hear where you are
  value(f = 0.5) {
    const n = 64 + Math.round(f * 24)
    click({ freq: 3600, gain: 0.04 })
    tone(NOTE(n), { dur: 0.06, gain: 0.07 })
  },
  // radio tuning: a breath of static under the tick
  tune(f = 0.5) {
    air({ dur: 0.09, from: 1800 + f * 2000, to: 1500 + f * 2000, q: 3, gain: 0.05, send: 0 })
    tone(NOTE(70 + Math.round(f * 20)), { dur: 0.05, gain: 0.04 })
  },
  station() {
    tone(NOTE(84), { dur: 0.14, gain: 0.06, send: 0.3 })
    tone(NOTE(91), { t: 0.07, dur: 0.3, gain: 0.05, send: 0.4 })
  },
  toggleOn() {
    tone(NOTE(79), { dur: 0.07, gain: 0.08 })
    tone(NOTE(84), { t: 0.05, dur: 0.12, gain: 0.08, send: 0.15 })
  },
  toggleOff() {
    tone(NOTE(84), { dur: 0.07, gain: 0.07 })
    tone(NOTE(76), { t: 0.05, dur: 0.12, gain: 0.07 })
  },
  select() {
    click({ freq: 2800, gain: 0.06 })
    tone(NOTE(83), { dur: 0.16, gain: 0.08, send: 0.25 })
  },
  pop() {
    tone(NOTE(88), { dur: 0.09, gain: 0.05, glide: NOTE(93), send: 0.2 })
  },
  // CarPlay handshake: a tiny blip per finished stage, an arpeggio when live
  step() {
    tone(NOTE(91), { dur: 0.08, gain: 0.05, send: 0.2 })
  },
  connected() {
    ;[72, 76, 79, 84, 88].forEach((n, i) => tone(NOTE(n), { t: i * 0.065, dur: 0.9, gain: 0.06, send: 0.5, pan: (i - 2) * 0.2 }))
  },
  error() {
    tone(NOTE(64), { dur: 0.16, gain: 0.12, type: 'triangle' })
    tone(NOTE(59), { t: 0.14, dur: 0.3, gain: 0.12, type: 'triangle', send: 0.15 })
  },
  // Startup, part one: a Cmaj9 pad swells up with the sky, through an
  // opening lowpass, with a few high glints drifting over it.
  boot() {
    const now = ctx.currentTime
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.Q.value = 0.7
    lp.frequency.setValueAtTime(260, now)
    lp.frequency.exponentialRampToValueAtTime(3400, now + 2.4)
    const bus2 = ctx.createGain()
    bus2.gain.setValueAtTime(0.0001, now)
    bus2.gain.exponentialRampToValueAtTime(0.5, now + 1.5)
    bus2.gain.setValueAtTime(0.5, now + 2.4)
    bus2.gain.exponentialRampToValueAtTime(0.0001, now + 5.2)
    lp.connect(bus2)
    bus2.connect(master)
    const s = ctx.createGain()
    s.gain.value = 0.6
    bus2.connect(s).connect(verb)
    ;[48, 55, 64, 71, 74].forEach((n, i) => {
      ;[-6, 6].forEach((cents) => {
        const o = ctx.createOscillator()
        o.type = i < 2 ? 'triangle' : 'sine'
        o.frequency.value = NOTE(n)
        o.detune.value = cents
        const g = ctx.createGain()
        g.gain.value = 0.07 / (1 + i * 0.25)
        o.connect(g).connect(lp)
        o.start(now)
        o.stop(now + 5.4)
      })
    })
    ;[0.7, 1.15, 1.7, 2.3].forEach((t, i) =>
      tone(NOTE([91, 95, 98, 103][i]), { t, dur: 0.9, gain: 0.025, send: 0.8, pan: i % 2 ? 0.4 : -0.4 }),
    )
    air({ t: 0.05, dur: 1.4, from: 300, to: 2400, gain: 0.05, send: 0.5 })
  },
  // Startup, part two: the wordmark lands.
  chime() {
    ;[84, 88, 91, 96].forEach((n, i) => tone(NOTE(n), { t: i * 0.045, dur: 1.6, gain: 0.06, send: 0.6, pan: (i - 1.5) * 0.25 }))
  },
  // Startup, part three: the knob arrives and the orbits fan out.
  arrive() {
    tone(NOTE(55), { dur: 0.5, gain: 0.14, glide: NOTE(43), attack: 0.01 })
    ;[0, 1, 2, 3].forEach((i) => click({ t: 0.35 + i * 0.07, freq: 3200 + i * 300, gain: 0.04 }))
  },
}

// ---------- public api ----------

let pending = null

export function sfx(name, arg) {
  pending = null // explicit sound wins over the queued default
  if (!ready()) return
  SOUNDS[name]?.(arg)
}

function queueDefault(name, arg) {
  const token = {}
  pending = token
  queueMicrotask(() => {
    if (pending !== token) return
    pending = null
    if (!ready()) return
    SOUNDS[name]?.(arg)
  })
}

// Wire defaults once. Knob events arrive before the app handles them, so the
// default is queued and the handler can override it.
let wired = false
export function wireSound() {
  if (wired) return
  wired = true
  bus.on('knob', (e) => {
    if (e.type === 'turn') queueDefault('tick', e.dir)
    else if (e.type === 'press') queueDefault('press')
    else if (e.type === 'back' || e.type === 'home') queueDefault('back')
  })
  bus.on('bump', () => sfx('bump'))
  bus.on('toast', () => sfx('pop'))
  subscribe(applyVolume)
  // unlock audio on the first input (browsers block it until then)
  const unlock = () => {
    if (getState().sounds) init()?.resume()
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('pointerdown', unlock)
  }
  window.addEventListener('keydown', unlock)
  window.addEventListener('pointerdown', unlock)
}

// dev hook for auditioning the palette from the console: __sfx('launch')
if (import.meta.env.DEV) window.__sfx = sfx
