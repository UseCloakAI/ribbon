import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useAppKnob, useReadout } from '../lib/appContext.js'
import { bus } from '../lib/bus.js'
import { toast } from '../lib/store.js'
import { EASE } from '../lib/motion.js'
import Shared from '../components/Shared.jsx'

// Sample data until an OBD-II reader is wired in.
const INITIAL = [
  { name: 'Trip A', km: 128.4, mins: 134, econ: 6.8 },
  { name: 'Trip B', km: 1846.2, mins: 1862, econ: 7.1 },
  { name: 'Since refuel', km: 312.7, mins: 341, econ: 6.5 },
]
const dur = (m) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`

export default function Trip({ icon }) {
  const [trips, setTrips] = useState(INITIAL)
  const [tab, setTab] = useState(0)
  const [dir, setDir] = useState(1)
  const t = trips[tab]
  const avg = t.mins ? (t.km / (t.mins / 60)).toFixed(0) : '0'

  useReadout({ key: 'app', icon })
  useAppKnob((e) => {
    if (e.type === 'turn') {
      const n = tab + e.dir
      if (n < 0 || n >= trips.length) bus.emit('bump', e.dir)
      else {
        setDir(e.dir)
        setTab(n)
      }
      return true
    }
    if (e.type === 'press') {
      setTrips((all) => all.map((x, i) => (i === tab ? { ...x, km: 0, mins: 0, econ: 0 } : x)))
      toast(`${t.name} reset`)
      return true
    }
    return false
  })

  const tiles = [
    ['Distance', t.km.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), 'km'],
    ['Drive time', dur(t.mins), 'min'],
    ['Average speed', avg, 'km/h'],
    ['Economy', t.econ.toFixed(1), 'L/100 km'],
  ]

  return (
    <div className="trip">
      <div className="tabs">
        <motion.span className="tab-ink" animate={{ x: tab * 168 }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
        {trips.map((x, i) => (
          <span key={x.name} className={`tab ${i === tab ? 'is-on' : ''}`}>
            {x.name}
          </span>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div
          key={tab}
          className="trip-grid"
          initial={{ opacity: 0, x: dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -30, transition: { duration: 0.16 } }}
          transition={{ duration: 0.34, ease: EASE }}
        >
          {tiles.map(([label, value, unit], i) => (
            <div key={label} className={`tile ${i === 0 ? 'is-hero' : ''}`}>
              <span className="tile-label">{label}</span>
              <span className="tile-value">
                <Shared id={i === 0 && tab === 0 ? 'trip-km' : undefined}>{value}</Shared>
                <small>{unit}</small>
              </span>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
      <p className="footnote">Sample data. Connect an OBD-II reader for live trips. Press to reset this trip.</p>
    </div>
  )
}
