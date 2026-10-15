import { useEffect, useRef } from 'react'
import { motion, useSpring, useTransform, useVelocity } from 'motion/react'
import { bus } from '../lib/bus.js'
import { CASCADE, EASE, EASE_IN, FAN, SPRING } from '../lib/motion.js'
import Shared from './Shared.jsx'

// A ring's rotation, in item units. `from` starts it wound back so it can
// unfurl into place; `active` lets it rubber-band when the knob hits an end.
export function useOrbit(index, { from, delay = 0, active = true } = {}) {
  const pos = useSpring(from ?? index, SPRING.orbit)
  const wound = useRef(from !== undefined)
  useEffect(() => {
    if (!wound.current) return pos.set(index)
    // first settle only: wait for the cue, then unfurl
    const t = setTimeout(() => {
      wound.current = false
      pos.set(index)
    }, delay * 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pos])
  useEffect(() => {
    if (!active) return
    return bus.on('bump', (dir) => {
      pos.set(index + dir * 0.16)
      setTimeout(() => pos.set(index), 90)
    })
  }, [active, index, pos])
  return pos
}

const rad = (d) => (d * Math.PI) / 180
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// One node riding a ring around the circle. Angle 0 is the selection slot
// (3 o'clock). When the ring spins fast, nodes trail a few degrees behind
// and catch up as it settles: follow-through, so the ring reads as having mass.
export function OrbitNode({ pos, i, radius, step, range, className, children }) {
  const vel = useVelocity(pos)
  const angle = useTransform([pos, vel], ([p, v]) => (i - p) * step + clamp(v * 0.9, -5, 5))
  const x = useTransform(angle, (a) => radius * Math.cos(rad(a)))
  const y = useTransform(angle, (a) => radius * Math.sin(rad(a)))
  const opacity = useTransform(angle, (a) => {
    const d = Math.abs(a)
    const solid = range * 0.55
    return d <= solid ? 1 : Math.max(0, 1 - (d - solid) / (range - solid))
  })
  const focus = useTransform(pos, (p) => Math.max(0, 1 - Math.abs(i - p)))
  return (
    <motion.div className={className} style={{ x, y, opacity }}>
      {children(focus)}
    </motion.div>
  )
}

export function CategoryNode({ cat, focus, layer, index, entering }) {
  const scale = useTransform(focus, (f) => 0.62 + 0.38 * f)
  const ink = useTransform(focus, (f) => 0.42 + 0.58 * f)
  const label = useTransform(focus, (f) => Math.max(0, f * 1.5 - 0.5))
  const labelY = useTransform(focus, (f) => (1 - f) * -6)
  const Icon = cat.icon
  return (
    <motion.div
      className={`cat ${layer === 'items' ? 'is-parked' : ''}`}
      initial={entering ? { opacity: 0, scale: 0.6 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.7, ease: EASE, delay: entering ? 0.42 + index * FAN : 0 }}
    >
      <motion.div className="cat-icon" style={{ scale, opacity: ink }}>
        <Icon size={46} weight="light" />
      </motion.div>
      <motion.span className="cat-label" style={{ opacity: label, y: labelY }}>
        {cat.label}
      </motion.span>
    </motion.div>
  )
}

export function ItemNode({ item, focus, index, entering, launch }) {
  const ink = useTransform(focus, (f) => 0.4 + 0.6 * f)
  const scale = useTransform(focus, (f) => 0.84 + 0.16 * f)
  const Icon = item.icon
  return (
    <motion.div
      className={`item ${launch ? 'is-launch' : ''}`}
      initial={{ opacity: 0, x: entering ? -26 : -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: entering ? 0.7 : 0.45, ease: EASE, delay: entering ? 0.74 + index * FAN : index * CASCADE }}
    >
      <motion.div className="item-row" style={{ scale, opacity: ink }}>
        {/* launch: a small inhale, then it swells as it hands off to the app */}
        <motion.div
          className="item-inner"
          animate={launch ? { scale: [1, 0.95, 1.04] } : { scale: 1 }}
          transition={launch ? { duration: 0.62, times: [0, 0.28, 1], ease: [EASE_IN, EASE] } : { duration: 0.2 }}
        >
          <span className="item-icon">
            <Icon size={28} weight="light" />
          </span>
          <Shared id={`title-${item.id}`} className="item-label">
            {item.label}
          </Shared>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
