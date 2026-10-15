import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../lib/store.js'
import { EASE_IN } from '../lib/motion.js'

export default function Toast() {
  const toast = useStore((s) => s.toast)
  return (
    <div className="toast-slot" role="status" aria-live="polite">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            className="toast"
            initial={{ opacity: 0, y: -16, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97, transition: { duration: 0.18, ease: EASE_IN } }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          >
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
