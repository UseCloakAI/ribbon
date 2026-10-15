import { motion } from 'motion/react'
import { clamp } from '../lib/store.js'

const SPRING = { type: 'spring', stiffness: 380, damping: 34 }

// A list the knob scrolls one row per notch. The focus band glides between
// rows and the list pages only when focus nears an edge.
export default function KnobList({ items, index, render, rowHeight = 76, visible = 6, keyOf = (_, i) => i }) {
  const maxStart = Math.max(0, items.length - visible)
  const start = clamp(index - Math.floor(visible / 2) + 1, 0, maxStart)
  return (
    <div className="klist" style={{ height: Math.min(items.length, visible) * rowHeight }}>
      <motion.div className="klist-track" animate={{ y: -start * rowHeight }} transition={SPRING}>
        <motion.div className="klist-focus" style={{ height: rowHeight }} animate={{ y: index * rowHeight }} transition={SPRING} />
        {items.map((it, i) => (
          <div key={keyOf(it, i)} className={`krow ${i === index ? 'is-focus' : ''}`} style={{ height: rowHeight }}>
            {render(it, i, i === index)}
          </div>
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
