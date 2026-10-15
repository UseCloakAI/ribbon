import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useSpring } from 'motion/react'
import { bus } from '../lib/bus.js'
import { C, KNOB_R as R } from '../lib/geo.js'

const RIM = `M ${R} 2 A ${R - 2} ${R - 2} 0 0 1 ${R} ${2 * R - 2}`

// Just a circle, half off the left edge. The options do the moving; the
// circle only breathes on press, fills its rim while an app loads, and
// shows a value when the knob is adjusting one.
export default function Knob({ readout, loading, hidden, entering }) {
  const press = useSpring(1, { stiffness: 600, damping: 22 })
  const [pulse, setPulse] = useState(0)

  useEffect(
    () =>
      bus.on('knob', (e) => {
        if (e.type !== 'press') return
        press.set(0.975)
        setTimeout(() => press.set(1), 110)
        setPulse((p) => p + 1)
      }),
    [press],
  )

  return (
    <motion.div
      className="knob"
      style={{ left: C.x - R, top: C.y - R, width: 2 * R, height: 2 * R }}
      initial={entering ? { x: -R, opacity: 0 } : false}
      animate={hidden ? { x: -R - 30, opacity: 0 } : { x: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 110, damping: 20, delay: entering ? 0.05 : 0 }}
      aria-hidden="true"
    >
      <motion.div className="knob-disc" style={{ scale: press }} />
      <AnimatePresence>
        {pulse > 0 && (
          <motion.span
            key={pulse}
            className="knob-pulse"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.16, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </AnimatePresence>
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
      <div className="knob-face" style={{ left: R + 16, top: R - 60, width: R * 0.78, height: 120 }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {readout?.value !== undefined && (
            <motion.div
              key={readout.key}
              className="knob-readout"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <span className="knob-value">{readout.value}</span>
              {readout.unit && <span className="knob-unit">{readout.unit}</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
