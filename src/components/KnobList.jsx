import { motion } from 'motion/react'
import { clamp } from '../lib/store.js'
import { CASCADE, EASE, SPRING } from '../lib/motion.js'


// A list the knob scrolls one row per notch. The focus band glides between
// rows and the list pages only when focus nears an edge.
export default function KnobList({ items, index, render, rowHeight = 76, visible = 6, keyOf = (_, i) => i }) {
  const maxStart = Math.max(0, items.length - visible)
  const start = clamp(index - Math.floor(visible / 2) + 1, 0, maxStart)
  return (
    <div className="klist" style={{ height: Math.min(items.length, visible) * rowHeight }}>
      <motion.div className="klist-track" animate={{ y: -start * rowHeight }} transition={SPRING.focus}>
        <motion.div
          className="klist-focus"
          style={{ height: rowHeight }}
          initial={{ y: index * rowHeight, scaleX: 0.96, opacity: 0 }}
          animate={{ y: index * rowHeight, scaleX: 1, opacity: 1 }}
          transition={{ y: SPRING.focus, scaleX: { duration: 0.5, ease: EASE, delay: 0.3 }, opacity: { duration: 0.3, delay: 0.3 } }}
        />
        {items.map((it, i) => (
          <motion.div
            key={keyOf(it, i)}
            className={`krow ${i === index ? 'is-focus' : ''}`}
            style={{ height: rowHeight }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.26 + Math.min(i, 8) * CASCADE }}
          >
            {render(it, i, i === index)}
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

export function SkeletonList({ rows = 5, rowHeight = 76 }) {
  return (
    <div className="klist" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="krow skel-row" style={{ height: rowHeight, animationDelay: `${i * 70}ms` }}>
          <span className="skel skel-art" />
          <span className="skel-lines">
            <span className="skel" style={{ width: `${46 + ((i * 17) % 30)}%` }} />
            <span className="skel skel-thin" style={{ width: `${28 + ((i * 11) % 20)}%` }} />
          </span>
        </div>
      ))}
    </div>
  )
}
