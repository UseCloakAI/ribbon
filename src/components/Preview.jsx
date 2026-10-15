import { motion, AnimatePresence } from 'motion/react'
import { EASE, EASE_IN } from '../lib/motion.js'
import { useStore } from '../lib/store.js'
import { PHONES, STATIONS, TRACKS, fmtTime } from '../data/media.js'
import { AlbumArt, Bars } from '../apps/NowPlaying.jsx'
import { useShared } from '../lib/shared.js'

// Items that show the same live state share one widget, so moving between
// them keeps the same elements on screen instead of swapping them.
const KIND = { nowplaying: 'music', library: 'music', carplay: 'phone', phones: 'phone' }

function Widget({ id }) {
  const s = useStore((x) => x)
  const art = useShared('np-art')
  const title = useShared('np-title', { uniform: true })
  const freq = useShared('radio-freq', { uniform: true })
  const t = TRACKS[s.track]
  switch (id) {
    case 'nowplaying':
    case 'library':
      return (
        <div className="pv-np">
          <div ref={art}>
            <AlbumArt track={t} size={92} />
          </div>
          <div>
            <b ref={title}>{t.title}</b>
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
          <span ref={freq} className="pv-num">
            {s.freq.toFixed(1)}
          </span>
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
// The right side only carries live state for the selected item: the song,
// the frequency, the phone. Names live on the ring, nothing is repeated.
// It moves with the ring: turning down lifts the old state up and away.
export default function Preview({ item, dir = 1, launching, entering }) {
  return (
    <motion.aside
      className="preview"
      initial={entering ? { opacity: 0, x: 32 } : false}
      animate={{ opacity: launching ? 0.35 : 1, x: 0 }}
      transition={{ duration: 0.8, ease: EASE, delay: entering ? 0.85 : 0 }}
    >
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.div
          key={KIND[item.id] ?? item.id}
          custom={dir}
          variants={{
            enter: (d) => ({ opacity: 0, y: d * 22 }),
            center: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE, delay: 0.05 } },
            exit: (d) => ({ opacity: 0, y: d * -16, transition: { duration: 0.18, ease: EASE_IN } }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
        >
          <Widget id={item.id} />
        </motion.div>
      </AnimatePresence>
    </motion.aside>
  )
}
