import { motion } from 'motion/react'
import { EASE, EASE_IN } from '../lib/motion.js'
import Shared from './Shared.jsx'

// Opening an app: the item's name travels off the ring into the title (a
// shared element, see Shared.jsx), then the body rises in under it.
// Closing sends the name back to the ring.
export default function AppFrame({ id, title, children, wide }) {
  return (
    <motion.section className={`app ${wide ? 'is-wide' : ''}`} exit={{ opacity: 1, transition: { duration: 0.4 } }}>
      <header className="app-head">
        <h2 className="app-title">
          <Shared id={`title-${id}`}>{title}</Shared>
        </h2>
      </header>
      <motion.div
        className="app-body"
        initial={{ opacity: 0, y: 22, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, transition: { duration: 0.18, ease: EASE_IN } }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.24 }}
      >
        {children}
      </motion.div>
    </motion.section>
  )
}
