import { useEffect, useRef } from 'react'
import { bus } from '../lib/bus.js'
import { useStore } from '../lib/store.js'
import { useReducedMotionPref } from '../lib/hooks.js'
import { musicLevel } from '../lib/player.js'

// Each ribbon is a bundle of thin strands whose spread is modulated by a
// slow sine, so the sheet appears to twist and pinch like the XMB wave.
const RIBBONS = [
  { y: 0.6, a1: 0.075, k1: 0.55, w1: 0.2, a2: 0.032, k2: 1.35, w2: 0.29, width: 0.17, kt: 0.72, wt: 0.16, p: 0, strands: 22, alpha: 0.5 },
  { y: 0.66, a1: 0.05, k1: 0.82, w1: 0.15, a2: 0.026, k2: 1.75, w2: 0.25, width: 0.11, kt: 1.08, wt: 0.22, p: 2.2, strands: 15, alpha: 0.34 },
]
const TAU = Math.PI * 2
const SPEED = { full: 1, calm: 0.35, still: 0 }

// Startup reveal: each line sweeps in on its own delay and speed, so the
// wave draws itself thread by thread instead of as one wipe. Seeded.
let seed = 11
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
const REVEAL = RIBBONS.map((r) => Array.from({ length: r.strands }, () => ({ delay: rand() * 0.45, dur: 0.9 + rand() * 1.0 })))
const ease = (x) => 1 - Math.pow(1 - x, 3)

export default function Sky({ mode }) {
  const canvas = useRef(null)
  const wave = useStore((s) => s.wave)
  const reduced = useReducedMotionPref()
  const cfg = useRef({})
  cfg.current = { mode, speed: reduced ? 0 : SPEED[wave] ?? 1, strandScale: wave === 'calm' ? 0.65 : 1 }

  useEffect(() => {
    const el = canvas.current
    const ctx = el.getContext('2d')
    let W = 0
    let H = 0
    let raf = 0
    let last = performance.now()
    let t = 8
    let energy = 0
    let push = 0
    let flash = 0
    let revealStart = null
    let dirty = true
    let music = 0
    let beat = 0
    const bands = [0, 0] // [lows, mids+highs], eased
    const samples = 96
    const cy = new Float32Array(samples + 1)
    const hw = new Float32Array(samples + 1)
    const sparks = Array.from({ length: 16 }, () => ({
      x: Math.random(),
      y: 0.38 + Math.random() * 0.48,
      v: 0.004 + Math.random() * 0.012,
      p: Math.random() * TAU,
      r: 0.6 + Math.random() * 1.6,
    }))

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const box = el.parentElement.getBoundingClientRect()
      W = Math.max(1, Math.round(box.width))
      H = Math.max(1, Math.round(box.height))
      el.width = Math.round(W * dpr)
      el.height = Math.round(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(0)
    }

    const offKnob = bus.on('knob', (e) => {
      dirty = true
      if (e.type === 'turn') energy += 0.9 * e.dir
      if (e.type === 'press') flash = 1
    })
    const offReveal = bus.on('wave:reveal', () => (revealStart = performance.now()))

    function draw(dt) {
      const { mode, speed, strandScale } = cfg.current
      const night = mode === 'night'
      const rgb = night ? '168,212,255' : '255,255,255'
      // the song breathes into the wave: a little more height and pace when
      // it swells, settling back as it quietens
      const m = speed ? musicLevel() : { level: 0, beat: 0, low: 0, high: 0 }
      bands[0] += (m.low - bands[0]) * Math.min(1, dt * 6)
      bands[1] += (m.high - bands[1]) * Math.min(1, dt * 7)
      // ease toward the readings so hits swell rather than jump
      music += (m.level - music) * Math.min(1, dt * 6)
      beat += (m.beat - beat) * Math.min(1, dt * 9)
      // each bass hit pushes the wave forward and brightens it
      energy += beat * dt * 5
      flash += (beat * 0.6 - flash) * Math.min(1, dt * 8)
      energy *= Math.exp(-dt * 2.2)
      push += energy * dt * 1.6
      flash *= Math.exp(-dt * 3)
      t += dt * speed * (1 + music * 0.9)

      let reveal = 1
      const since = revealStart === null ? Infinity : (performance.now() - revealStart - 250) / 1000
      if (revealStart !== null) {
        reveal = Math.max(0, Math.min(1, since / 1.5))
        if (since > 2) revealStart = null
        reveal = ease(reveal)
      }
      const strandX = (ri, s) => {
        if (since === Infinity) return W
        const rv = REVEAL[ri][s % REVEAL[ri].length]
        return W * ease(Math.max(0, Math.min(1, (since - rv.delay) / rv.dur)))
      }

      ctx.clearRect(0, 0, W, H)
      if (reveal <= 0) return
      const maxX = W * reveal

      for (let ri = 0; ri < RIBBONS.length; ri++) {
        const base = RIBBONS[ri]
        // the big wave rides the lows (and the kicks), the small one the mids and highs
        const b = bands[ri]
        const kick = ri === 0 ? beat : 0
        const lift = 1 + b * 1.1 + kick * 0.35
        const r = { ...base, a1: base.a1 * lift, a2: base.a2 * lift, width: base.width * (1 + b * 0.7 + kick * 0.3), alpha: Math.min(1, base.alpha * (1 + b * 0.9)) }
        for (let i = 0; i <= samples; i++) {
          const nx = i / samples
          const ph = t + push
          cy[i] =
            H * r.y +
            Math.sin(nx * r.k1 * TAU + ph * r.w1 + r.p) * H * r.a1 +
            Math.sin(nx * r.k2 * TAU - ph * r.w2) * H * r.a2
          hw[i] = H * r.width * Math.sin(nx * r.kt * TAU + ph * r.wt + r.p) * (0.55 + 0.45 * Math.sin(nx * Math.PI))
        }

        // translucent sheet between the outer strands
        ctx.beginPath()
        for (let i = 0; i <= samples; i++) {
          const x = (i / samples) * W
          if (x > maxX) break
          const y = cy[i] - hw[i] / 2
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        }
        for (let i = samples; i >= 0; i--) {
          const x = Math.min((i / samples) * W, maxX)
          ctx.lineTo(x, cy[i] + hw[i] / 2)
        }
        ctx.closePath()
        ctx.fillStyle = `rgba(${rgb},${(night ? 0.05 : 0.12) + flash * 0.05})`
        ctx.fill()

        const n = Math.max(6, Math.round(r.strands * strandScale))
        ctx.lineWidth = 1
        for (let s = 0; s < n; s++) {
          const u = s / (n - 1) - 0.5
          const edge = Math.pow(Math.abs(u) * 2, 2)
          ctx.strokeStyle = `rgba(${rgb},${r.alpha * (night ? 1 : 1.3) * (0.22 + 0.78 * edge) * (1 + flash * 0.4)})`
          const sx = strandX(ri, s)
          if (sx <= 0) continue
          ctx.beginPath()
          for (let i = 0; i <= samples; i++) {
            const x = (i / samples) * W
            if (x > sx) break
            const y = cy[i] + u * hw[i]
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
          }
          ctx.stroke()
        }
      }

      for (const p of sparks) {
        p.x += p.v * dt * (speed || 0) + energy * dt * 0.01
        if (p.x > 1.02) p.x -= 1.04
        if (p.x < -0.02) p.x += 1.04
        const x = p.x * W
        if (x > maxX) continue
        const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.7 + p.p))
        ctx.fillStyle = `rgba(${rgb},${a * (night ? 0.8 : 0.9)})`
        ctx.beginPath()
        ctx.arc(x, p.y * H + Math.sin(t * 0.6 + p.p) * 6, p.r, 0, TAU)
        ctx.fill()
      }
    }

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const idle = (cfg.current.speed === 0 || document.hidden) && Math.abs(energy) < 0.01 && flash < 0.01 && revealStart === null
      if (!document.hidden && (!idle || dirty)) {
        draw(dt)
        dirty = false
      }
      raf = requestAnimationFrame(loop)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(el.parentElement)
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      offKnob()
      offReveal()
    }
  }, [])

  // redraw the still frame when the palette flips
  useEffect(() => bus.emit('knob', { type: 'noop' }), [mode])

  return (
    <div className="sky" aria-hidden="true">
      <div className="sky-layer sky-day" style={{ opacity: mode === 'night' ? 0 : 1 }} />
      <div className="sky-layer sky-night" style={{ opacity: mode === 'night' ? 1 : 0 }} />
      <canvas ref={canvas} className="wave" />
    </div>
  )
}
