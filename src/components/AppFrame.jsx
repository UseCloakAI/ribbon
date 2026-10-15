import { motion } from 'motion/react'
import { C, R_ITEM } from '../lib/geo.js'
import { EASE, EASE_IN, EASE_IO } from '../lib/motion.js'

// Where the selected item's label sits on the ring, relative to the title.
// Item label: slot x + icon (44) + gap (14) - row inset (22); title: left 250,
// top 64, 36px tall. Label is 22px, so the title starts at 22/36 scale.
const FROM = { x: R_ITEM + 36 - 250, y: C.y - 82, scale: 22 / 36 }

// Opening an app: the item's name lifts off the ring and flies along a
// gentle arc into the title (x decelerates faster than y, which bows the
// path), then the body rises in under it. Closing runs the arc back.
export default function AppFrame({ title, children, wide }) {
  return (
    <motion.section className={`app ${wide ? 'is-wide' : ''}`} exit={{ opacity: 1, transition: { duration: 0.4 } }}>
      <header className="app-head">
        <motion.h2
          className="app-title"
          style={{ transformOrigin: '0% 50%' }}
          initial={{ ...FROM, opacity: 0 }}
          animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          exit={{
            ...FROM,
            opacity: 0,
            transition: { x: { duration: 0.4, ease: EASE_IO }, y: { duration: 0.4, ease: EASE }, scale: { duration: 0.4, ease: EASE_IO }, opacity: { duration: 0.4, ease: EASE_IN } },
          }}
          transition={{
            x: { duration: 0.62, ease: EASE },
            y: { duration: 0.62, ease: EASE_IO },
            scale: { duration: 0.62, ease: EASE_IO },
            opacity: { duration: 0.22, ease: EASE },
          }}
        >
          {title}
        </motion.h2>
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
