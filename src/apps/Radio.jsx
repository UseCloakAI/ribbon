import { motion, AnimatePresence } from 'motion/react'
import { useAppKnob, useReadout } from '../lib/appContext.js'
import { bus } from '../lib/bus.js'
import { getState, setState, useStore } from '../lib/store.js'
import { STATIONS } from '../data/media.js'

const MIN = 87.5
const MAX = 108.0
const PX = 14 // pixels per 0.1 MHz
const TICKS = Array.from({ length: Math.round((MAX - MIN) * 10) + 1 }, (_, i) => +(MIN + i / 10).toFixed(1))

export default function Radio() {
  const freq = useStore((s) => s.freq)
  const station = STATIONS.find((st) => Math.abs(st.freq - freq) < 0.05)

  useReadout({ key: 'fm', value: freq.toFixed(1), unit: 'FM' })

  useAppKnob((e) => {
    if (e.type === 'turn') {
      const f = +(getState().freq + e.dir * 0.1).toFixed(1)
      if (f < MIN || f > MAX) bus.emit('bump', e.dir)
      else setState({ freq: f })
      return true
    }
    if (e.type === 'press') {
      const cur = getState().freq
      const next = STATIONS.find((st) => st.freq > cur + 0.05) ?? STATIONS[0]
      setState({ freq: next.freq })
      return true
    }
    return false
  })

  return (
    <div className="radio">
      <div className="radio-readout">
        <span className="radio-freq">{freq.toFixed(1)}</span>
        <span className="radio-band">FM</span>
      </div>
      <div className="radio-station">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={station?.name ?? 'scan'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className={station ? '' : 'is-muted'}
          >
            {station ? `${station.name}, ${station.genre}` : 'No station here'}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="dial" aria-hidden="true">
        <motion.div
          className="dial-track"
          animate={{ x: -((freq - MIN) * 10) * PX }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        >
          {TICKS.map((t) => {
            const major = Math.abs(t - Math.round(t)) < 0.01
            const half = !major && Math.abs(t * 2 - Math.round(t * 2)) < 0.01
            const preset = STATIONS.some((s) => Math.abs(s.freq - t) < 0.05)
            return (
              <span key={t} className={`tick ${major ? 'is-major' : half ? 'is-half' : ''} ${preset ? 'is-preset' : ''}`} style={{ width: PX }}>
                {major && <em>{Math.round(t)}</em>}
              </span>
            )
          })}
        </motion.div>
        <span className="dial-needle" />
      </div>

      <div className="presets">
        {STATIONS.map((st) => (
          <span key={st.freq} className={`preset ${Math.abs(st.freq - freq) < 0.05 ? 'is-on' : ''}`}>
            <b>{st.freq.toFixed(1)}</b>
            {st.name}
          </span>
        ))}
      </div>
    </div>
  )
}
