import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useAppKnob, useReadout } from '../lib/appContext.js'
import { bus } from '../lib/bus.js'

const GAUGES = [
  { id: 'speed', label: 'Speed', unit: 'km/h', min: 0, max: 180, fmt: (v) => v.toFixed(0) },
  { id: 'rpm', label: 'Engine', unit: 'rpm', min: 0, max: 7000, fmt: (v) => (Math.round(v / 10) * 10).toFixed(0) },
  { id: 'coolant', label: 'Coolant', unit: '°C', min: 40, max: 130, fmt: (v) => v.toFixed(0) },
  { id: 'battery', label: 'Battery', unit: 'V', min: 10, max: 16, fmt: (v) => v.toFixed(1) },
]

// Demo signal: smooth, slightly irregular, like a car cruising.
function sample(t) {
  return {
    speed: 64 + 9 * Math.sin(t / 38) + 3 * Math.sin(t / 6.7),
    rpm: 2150 + 420 * Math.sin(t / 31) + 140 * Math.sin(t / 4.3),
    coolant: 89 + 1.2 * Math.sin(t / 90),
    battery: 14.1 + 0.08 * Math.sin(t / 17),
  }
}

const SWEEP = 240
const arc = (r, a0, a1) => {
  const p = (a) => {
    const rad = ((a - 90) * Math.PI) / 180
    return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)]
  }
  const [x0, y0] = p(a0)
  const [x1, y1] = p(a1)
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`
}
const PATH = arc(80, -SWEEP / 2, SWEEP / 2)

function Dial({ g, value, size, focused }) {
  const f = Math.min(1, Math.max(0, (value - g.min) / (g.max - g.min)))
  return (
    <div className={`gauge ${focused ? 'is-focus' : ''}`} style={{ width: size, height: size, '--g': `${size}px` }}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <path d={PATH} className="gauge-track" pathLength="1" />
        <motion.path d={PATH} className="gauge-value" pathLength="1" animate={{ pathLength: f }} transition={{ duration: 0.2, ease: 'linear' }} />
      </svg>
      <div className="gauge-read">
        <span className="gauge-num">{g.fmt(value)}</span>
        <span className="gauge-unit">{g.unit}</span>
        <span className="gauge-label">{g.label}</span>
      </div>
    </div>
  )
}

export default function Gauges() {
  const [t, setT] = useState(0)
  const [focus, setFocus] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 120)
    return () => clearInterval(id)
  }, [])
  const v = sample(t)
  const g = GAUGES[focus]

  useReadout({ key: `g-${g.id}`, value: g.fmt(v[g.id]), unit: g.unit })
  useAppKnob((e) => {
    if (e.type === 'turn') {
      const n = focus + e.dir
      if (n < 0 || n >= GAUGES.length) bus.emit('bump', e.dir)
      else setFocus(n)
      return true
    }
    return e.type === 'press'
  })

  return (
    <div className="gauges">
      <motion.div key={g.id} className="gauges-main" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
        <Dial g={g} value={v[g.id]} size={330} focused />
      </motion.div>
      <div className="gauges-side">
        {GAUGES.map((x, i) => (
          <Dial key={x.id} g={x} value={v[x.id]} size={114} focused={i === focus} />
        ))}
      </div>
      <p className="footnote gauges-note">Demo signal. Live values arrive once an OBD-II reader is connected.</p>
    </div>
  )
}
