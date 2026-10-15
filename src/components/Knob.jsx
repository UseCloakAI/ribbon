import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'motion/react'
import { bus } from '../lib/bus.js'
import { C, KNOB } from '../lib/geo.js'

const DETENT = 12 // degrees per notch, matches a 30-detent encoder
const RING_R = 96
const RING_C = 2 * Math.PI * RING_R

// The knob is the anchor of the whole UI: it spins with every notch,
// squashes on press, rings out a ripple, and doubles as the loader.
export default function Knob({ readout, loading, hidden, entering }) {
  const target = useRef(0)
  const angle = useSpring(0, { stiffness: 320, damping: 26, mass: 0.7 })
  const bezel = useTransform(angle, (a) => a * -0.18)
  const press = useSpring(1, { stiffness: 700, damping: 18 })
  const [ripples, setRipples] = useState([])

  useEffect(() => {
    const offKnob = bus.on('knob', (e) => {
      if (e.type === 'turn') {
        target.current += e.dir * DETENT
        angle.set(target.current)
      } else if (e.type === 'press' || e.type === 'back' || e.type === 'home') {
        press.set(e.type === 'press' ? 0.92 : 0.96)
        setTimeout(() => press.set(1), 110)
        if (e.type === 'press') {
          const id = performance.now()
          setRipples((r) => [...r.slice(-2), id])
          setTimeout(() => setRipples((r) => r.filter((x) => x !== id)), 700)
        }
      }
    })
    // rubber band at the end of a ring: overshoot then settle back
    const offBump = bus.on('bump', (dir) => {
      angle.set(target.current + dir * 5)
      setTimeout(() => angle.set(target.current), 90)
    })
    return () => {
      offKnob()
      offBump()
    }
  }, [angle, press])

  return (
    <motion.div
      className="knob"
      style={{ left: C.x - KNOB / 2, top: C.y - KNOB / 2, width: KNOB, height: KNOB }}
      initial={entering ? { opacity: 0, scale: 0.6, rotate: -90 } : false}
      animate={hidden ? { opacity: 0, scale: 0.7, x: -180 } : { opacity: 1, scale: 1, rotate: 0, x: 0 }}
      transition={{ type: 'spring', stiffness: 170, damping: 22, delay: entering ? 0.05 : 0 }}
      aria-hidden="true"
    >
      {ripples.map((id) => (
        <motion.span
          key={id}
          className="knob-ripple"
          initial={{ scale: 0.72, opacity: 0.55 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
      <motion.div className="knob-bezel" style={{ rotate: bezel }} />
      <svg className="knob-progress" viewBox="0 0 252 252">
        <circle className="knob-progress-track" cx="126" cy="126" r={RING_R} />
        <AnimatePresence>
          {loading && (
            <motion.circle
              key="p"
              className="knob-progress-bar"
              cx="126"
              cy="126"
              r={RING_R}
              strokeDasharray={RING_C}
              initial={{ strokeDashoffset: RING_C, opacity: 1 }}
              animate={{ strokeDashoffset: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.62, ease: [0.65, 0, 0.35, 1] }}
            />
          )}
        </AnimatePresence>
      </svg>
      <motion.div className="knob-body" style={{ scale: press }}>
        <motion.div className="knob-knurl" style={{ rotate: angle }}>
          <span className="knob-notch" />
        </motion.div>
        <div className="knob-face">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={readout?.key ?? 'none'}
              className="knob-readout"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            >
              {readout?.icon && <readout.icon size={30} weight="duotone" />}
              {readout?.value !== undefined && <span className="knob-value">{readout.value}</span>}
              {readout?.unit && <span className="knob-unit">{readout.unit}</span>}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
