import { useEffect } from 'react'
import { motion, useSpring, useTransform } from 'motion/react'

export function useOrbit(index) {
  const pos = useSpring(index, { stiffness: 230, damping: 27, mass: 0.9 })
  useEffect(() => pos.set(index), [index, pos])
  return pos
}

const rad = (d) => (d * Math.PI) / 180

// One node riding a ring around the knob. Angle 0 is the selection slot
// (3 o'clock); later items hang below it, earlier ones above.
export function OrbitNode({ pos, i, radius, step, range, className, children }) {
  const angle = useTransform(pos, (p) => (i - p) * step)
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
  const Icon = cat.icon
  return (
    <motion.div
      className={`cat ${layer === 'items' ? 'is-parked' : ''}`}
      initial={entering ? { opacity: 0, x: -40 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: entering ? 0.4 + index * 0.07 : 0 }}
    >
      <motion.div className="cat-icon" style={{ scale, opacity: ink }}>
        <Icon size={46} weight="light" />
      </motion.div>
      <motion.span className="cat-label" style={{ opacity: label }}>
        {cat.label}
      </motion.span>
    </motion.div>
  )
}

export function ItemNode({ item, focus, layer, index, entering }) {
  const ink = useTransform(focus, (f) => 0.4 + 0.6 * f)
  const scale = useTransform(focus, (f) => 0.84 + 0.16 * f)
  const sub = useTransform(focus, (f) => Math.max(0, f * 2 - 1))
  const Icon = item.icon
  return (
    <motion.div
      className={`item ${layer === 'items' ? 'is-live' : ''}`}
      initial={entering ? { opacity: 0, x: -30 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 24, delay: entering ? 0.62 + index * 0.06 : 0 }}
    >
      <motion.div className="item-row" style={{ scale, opacity: ink }}>
        <span className="item-icon">
          <Icon size={28} weight="light" />
        </span>
        <div className="item-text">
          <span className="item-label">{item.label}</span>
          <motion.span className="item-sub" style={{ opacity: sub }}>
            {item.sub}
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  )
}
