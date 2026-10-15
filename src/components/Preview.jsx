import { motion, AnimatePresence } from 'motion/react'
import { useStore } from '../lib/store.js'
import { PHONES, STATIONS, TRACKS, fmtTime } from '../data/media.js'
import { AlbumArt, Bars } from '../apps/NowPlaying.jsx'

function Widget({ id }) {
  const s = useStore((x) => x)
  const t = TRACKS[s.track]
  switch (id) {
    case 'nowplaying':
    case 'library':
      return (
        <div className="pv-np">
          <AlbumArt track={t} size={92} />
          <div>
            <b>{t.title}</b>
            <span>{t.artist}</span>
            <span className="pv-time">
              <Bars playing={s.playing} count={4} /> {fmtTime(s.position)} / {fmtTime(t.length)}
            </span>
          </div>
        </div>
      )
    case 'radio': {
      const st = STATIONS.find((x) => Math.abs(x.freq - s.freq) < 0.05)
      return (
        <div className="pv-big">
          {s.freq.toFixed(1)}
          <small>FM {st ? st.name : ''}</small>
        </div>
      )
    }
    case 'carplay':
    case 'phones':
      return (
        <div className="pv-big pv-big-sm">
          {PHONES[s.phone]?.name}
          <small>{s.dongle ? 'Adapter ready' : 'Adapter not found'}</small>
        </div>
      )
    case 'dongle':
      return (
        <div className="pv-big pv-big-sm">
          {s.dongle ? 'Connected' : 'Not found'}
          <small>USB adapter</small>
        </div>
      )
    case 'trip':
      return (
        <div className="pv-big">
          128.4
          <small>km on Trip A</small>
        </div>
      )
    case 'gauges':
      return (
        <div className="pv-big">
          64
          <small>km/h, demo signal</small>
        </div>
      )
    case 'display':
      return (
        <div className="pv-big">
          {s.brightness}%
          <small>{s.mode === 'auto' ? 'Auto theme' : s.mode === 'day' ? 'Day theme' : 'Night theme'}</small>
        </div>
      )
    case 'sound':
      return (
        <div className="pv-big">
          {s.volume}
          <small>volume</small>
        </div>
      )
    case 'knob':
      return (
        <div className="pv-big pv-big-sm">
          {s.invert ? 'Reversed' : 'Clockwise is next'}
          <small>{s.sensitivity} wheel steps</small>
        </div>
      )
    case 'about':
      return (
        <div className="pv-big pv-big-sm">
          ribbon {__APP_VERSION__}
          <small>1024 × 768</small>
        </div>
      )
    default:
      return null
  }
}

// The right side only carries live state for the selected item: the song,
// the frequency, the phone. Names live on the ring, nothing is repeated.
export default function Preview({ item, launching, entering }) {
  return (
    <motion.aside
      className="preview"
      initial={entering ? { opacity: 0, x: 40 } : false}
      animate={{ opacity: launching ? 0.4 : 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: entering ? 0.8 : 0 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8, transition: { duration: 0.14, ease: [0.3, 0, 1, 1] } }}
          transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
        >
          <Widget id={item.id} />
        </motion.div>
      </AnimatePresence>
    </motion.aside>
  )
}
