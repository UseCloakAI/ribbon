import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../lib/store.js'

const SETS = {
  cats: [['← →', 'turn'], ['enter', 'open'], ['esc', 'back']],
  items: [['← →', 'turn'], ['enter', 'launch'], ['esc', 'back']],
  app: [['← →', 'turn'], ['enter', 'press'], ['esc', 'back'], ['hold esc', 'home']],
}

// On-screen legend for the keyboard stand-in. It shows when the context
// changes and fades after a few seconds, so the screen stays quiet.
// Turned off entirely from Settings > Knob.
export default function Hints({ context }) {
  const enabled = useStore((s) => s.hints)
  const [awake, setAwake] = useState(true)
  useEffect(() => {
    setAwake(true)
    const t = setTimeout(() => setAwake(false), 4500)
    return () => clearTimeout(t)
  }, [context])
  const show = enabled && awake
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
