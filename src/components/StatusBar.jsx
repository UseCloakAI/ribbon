import { motion } from 'motion/react'
import { Bluetooth, Thermometer } from '@phosphor-icons/react'
import { useClock } from '../lib/hooks.js'
import { useStore } from '../lib/store.js'

const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export default function StatusBar({ entering }) {
  const now = useClock(1000)
  const carplay = useStore((s) => s.carplay)
  const h = now.getHours() % 12 || 12
  const m = String(now.getMinutes()).padStart(2, '0')
  return (
    <motion.header
      className="status"
      initial={entering ? { opacity: 0, y: -24 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: entering ? 0.2 : 0 }}
    >
      <span className="wordmark">ribbon</span>
      <div className="status-right">
        <span className="status-chip">
          <Thermometer size={18} weight="bold" aria-hidden="true" />
          14°
        </span>
        <span className={`status-chip ${carplay === 'streaming' ? 'is-on' : ''}`} aria-label="Bluetooth">
          <Bluetooth size={18} weight="bold" aria-hidden="true" />
        </span>
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
