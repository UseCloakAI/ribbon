import { motion } from 'motion/react'
import { useClock } from '../lib/hooks.js'
import Shared from './Shared.jsx'
import { EASE } from '../lib/motion.js'

const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export default function StatusBar({ entering }) {
  const now = useClock(1000)
  const h = now.getHours() % 12 || 12
  const m = String(now.getMinutes()).padStart(2, '0')
  return (
    <motion.header
      className="status"
      initial={entering ? { opacity: 0, y: -12 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: EASE, delay: entering ? 0.95 : 0 }}
    >
      <div className="status-right">
        <div className="clock">
          <Shared id="clock" className="clock-time">
            {h}
            <span className="clock-colon">:</span>
            {m}
          </Shared>
          <span className="clock-date">{fmt.format(now)}</span>
        </div>
      </div>
    </motion.header>
  )
}
