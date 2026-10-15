import { motion } from 'motion/react'
import { useClock } from '../lib/hooks.js'

const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export default function StatusBar({ entering }) {
  const now = useClock(1000)
  const h = now.getHours() % 12 || 12
  const m = String(now.getMinutes()).padStart(2, '0')
  return (
    <motion.header
      className="status"
      initial={entering ? { opacity: 0, y: -24 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: entering ? 0.2 : 0 }}
    >
      <div className="status-right">
        <div className="clock">
          <span className="clock-time">
            {h}
            <span className="clock-colon">:</span>
            {m}
          </span>
          <span className="clock-date">{fmt.format(now)}</span>
        </div>
      </div>
    </motion.header>
  )
}
