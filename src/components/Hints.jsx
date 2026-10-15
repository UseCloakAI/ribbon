import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../lib/store.js'

const SETS = {
  cats: [['← →', 'turn'], ['enter', 'open'], ['esc', 'back']],
  items: [['← →', 'turn'], ['enter', 'launch'], ['esc', 'back']],
  app: [['← →', 'turn'], ['enter', 'press'], ['esc', 'back'], ['hold esc', 'home']],
}

// On-screen legend for the keyboard stand-in. Hidden from Settings > Knob.
export default function Hints({ context }) {
  const show = useStore((s) => s.hints)
  const set = SETS[context]
  return (
    <AnimatePresence>
      {show && set && (
        <motion.div
          className="hints"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {set.map(([k, label]) => (
              <motion.span
                key={context + k}
                className="hint"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <kbd>{k}</kbd>
                {label}
              </motion.span>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
