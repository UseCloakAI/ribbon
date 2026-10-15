import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useSpring } from 'motion/react'
import { bus } from '../lib/bus.js'
import { C, KNOB_R as R } from '../lib/geo.js'

const DETENT = 6 // degrees of rim travel per notch
const RIM = `M ${R} 3 A ${R - 3} ${R - 3} 0 0 1 ${R} ${2 * R - 3}`

// A plain disc, half off screen. The rim ticks turn with every notch, the
// accent pointer at 3 o'clock marks the selection slot, the rim doubles as
// the loader, and the visible half carries the readout.
export default function Knob({ readout, loading, hidden, entering }) {
  const target = useRef(0)
  const angle = useSpring(entering ? -140 : 0, { stiffness: 260, damping: 30, mass: 0.8 })
  const press = useSpring(1, { stiffness: 700, damping: 20 })
  const [ripples, setRipples] = useState([])

  useEffect(() => {
    if (entering) {
      const t = setTimeout(() => angle.set(0), 120)
      return () => clearTimeout(t)
    }
  }, [entering, angle])

  useEffect(() => {
    const offKnob = bus.on('knob', (e) => {
      if (e.type === 'turn') {
        target.current += e.dir * DETENT
        angle.set(target.current)
      } else if (e.type === 'press' || e.type === 'back' || e.type === 'home') {
        press.set(e.type === 'press' ? 0.965 : 0.985)
        setTimeout(() => press.set(1), 100)
        if (e.type === 'press') {
          const id = performance.now()
          setRipples((r) => [...r.slice(-2), id])
          setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 800)
        }
      }
    })
    const offBump = bus.on('bump', (dir) => {
      angle.set(target.current + dir * 2.5)
      setTimeout(() => angle.set(target.current), 80)
    })
    return () => {
      offKnob()
      offBump()
    }
  }, [angle, press])

  return (
    <motion.div
      className="knob"
      style={{ left: C.x - R, top: C.y - R, width: 2 * R, height: 2 * R }}
      initial={entering ? { x: -R, opacity: 0 } : false}
      animate={hidden ? { x: -R - 30, opacity: 0 } : { x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 110, damping: 20, delay: entering ? 0.05 : 0 }}
      aria-hidden="true"
    >
      {ripples.map((id) => (
        <motion.span
          key={id}
          className="knob-ripple"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.22, opacity: 0 }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      <motion.div className="knob-disc" style={{ scale: press }}>
        <motion.div className="knob-ticks" style={{ rotate: angle }} />
      </motion.div>
      <svg className="knob-load" viewBox={`0 0 ${2 * R} ${2 * R}`}>
        <AnimatePresence>
          {loading && (
            <motion.path
              key="l"
              d={RIM}
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.62, ease: [0.65, 0, 0.35, 1] }}
            />
          )}
        </AnimatePresence>
      </svg>
      <span className="knob-pointer" />
      <div className="knob-face" style={{ left: R + 20, top: R - 70, width: R * 0.74, height: 140 }}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={readout?.key ?? 'none'}
            className="knob-readout"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12, transition: { duration: 0.12 } }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {readout?.icon && <readout.icon size={readout.value !== undefined ? 24 : 34} weight="light" />}
            {readout?.value !== undefined && <span className="knob-value">{readout.value}</span>}
            {readout?.unit && <span className="knob-unit">{readout.unit}</span>}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
