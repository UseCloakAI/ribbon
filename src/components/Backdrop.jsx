import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../lib/store.js'
import { TRACKS } from '../data/media.js'
import { musicTempo } from '../lib/player.js'
import { EASE, EASE_IN } from '../lib/motion.js'

// Apple Music style living background for Now Playing: a wash in the
// artwork's colours and a few large soft orbs drifting on slow Lissajous
// paths. Each orb breathes on the detected beat (a quick swell, a slow
// release) so the room pulses with the song. It sits under the waves.

// Pull a small palette from artwork: average the vivid pixels of each
// third of a tiny downscale.
function paletteFromImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = c.height = 24
      const g = c.getContext('2d')
      g.drawImage(img, 0, 0, 24, 24)
      const d = g.getImageData(0, 0, 24, 24).data
      const out = []
      for (let part = 0; part < 3; part++) {
        let r = 0, gg = 0, b = 0, n = 0
        for (let y = part * 8; y < part * 8 + 8; y++)
          for (let x = 0; x < 24; x++) {
            const i = (y * 24 + x) * 4
            const mx = Math.max(d[i], d[i + 1], d[i + 2])
            const mn = Math.min(d[i], d[i + 1], d[i + 2])
            const w = 0.2 + (mx - mn) / 255 // favour saturated pixels
            r += d[i] * w; gg += d[i + 1] * w; b += d[i + 2] * w; n += w
          }
        out.push(`rgb(${Math.round(r / n)}, ${Math.round(gg / n)}, ${Math.round(b / n)})`)
      }
      resolve(out)
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
}

const hues = (h) => [`hsl(${h} 75% 62%)`, `hsl(${h + 28} 70% 48%)`, `hsl(${h - 24} 80% 70%)`]

const ORBS = [
  { size: 0.75, ax: 0.22, ay: 0.16, fx: 0.031, fy: 0.023, cx: 0.66, cy: 0.38, c: 0, beat: 0.09 },
  { size: 0.6, ax: 0.18, ay: 0.2, fx: 0.019, fy: 0.037, cx: 0.4, cy: 0.62, c: 1, beat: 0.06 },
  { size: 0.5, ax: 0.25, ay: 0.14, fx: 0.043, fy: 0.017, cx: 0.82, cy: 0.7, c: 2, beat: 0.12 },
  { size: 0.38, ax: 0.15, ay: 0.22, fx: 0.027, fy: 0.047, cx: 0.55, cy: 0.2, c: 0, beat: 0.15 },
]

function Orbs({ colors }) {
  const els = useRef([])
  useEffect(() => {
    let raf
    let pulse = 0
    let lastPhase = 1
    const t0 = performance.now()
    const loop = (now) => {
      const t = (now - t0) / 1000
      const { bpm, phase } = musicTempo()
      if (bpm && phase < lastPhase) pulse = 1 // crossed a beat
      lastPhase = phase
      pulse *= 0.93
      // with no tempo yet, breathe slowly on its own
      const breath = bpm ? pulse : 0.5 + 0.5 * Math.sin(t * 1.1)
      ORBS.forEach((o, i) => {
        const el = els.current[i]
        if (!el) return
        const x = (o.cx + o.ax * Math.sin(t * TAU * o.fx + i)) * 100
        const y = (o.cy + o.ay * Math.cos(t * TAU * o.fy + i * 2)) * 100
        const s = 1 + breath * o.beat
        el.style.left = `${x}%`
        el.style.top = `${y}%`
        el.style.transform = `translate(-50%, -50%) scale(${s})`
      })
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return ORBS.map((o, i) => (
    <span
      key={i}
      ref={(el) => (els.current[i] = el)}
      className="orb"
      style={{
        width: `${o.size * 130}%`,
        background: `radial-gradient(circle, ${colors[o.c]} 0%, transparent 68%)`,
      }}
    />
  ))
}
const TAU = Math.PI * 2

export default function Backdrop({ active }) {
  const trackIdx = useStore((s) => s.track)
  const track = TRACKS[trackIdx]
  const [colors, setColors] = useState(() => hues(track.hue))

  useEffect(() => {
    let alive = true
    if (track.art) paletteFromImage(track.art).then((p) => alive && setColors(p ?? hues(track.hue)))
    else setColors(hues(track.hue))
    return () => {
      alive = false
    }
  }, [track])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="backdrop"
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: EASE_IN } }}
          transition={{ duration: 1.2, ease: EASE }}
        >
          {/* colour changes between songs cross-fade */}
          <AnimatePresence initial={false}>
            <motion.div
              key={colors.join()}
              className="backdrop-wash"
              style={{ background: `linear-gradient(150deg, ${colors[1]}, ${colors[0]} 55%, ${colors[2]})` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, ease: EASE }}
            >
              <Orbs colors={colors} />
              <span className="backdrop-veil" />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
