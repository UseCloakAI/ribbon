import { motion, AnimatePresence } from 'motion/react'
import { EASE, EASE_IN } from '../lib/motion.js'
import { useStore } from '../lib/store.js'
import { PHONES, TRACKS, fmtTime } from '../data/media.js'
import { VIDEOS } from '../data/videos.js'
import { AlbumArt, Bars } from '../apps/NowPlaying.jsx'
import { useShared } from '../lib/shared.js'
import Shared from './Shared.jsx'

// Items that show the same live state share one widget, so moving between
// them keeps the same elements on screen instead of swapping them.
const KIND = { nowplaying: 'music', library: 'music' }

function Widget({ id }) {
  const s = useStore((x) => x)
  const art = useShared('np-art')
  const title = useShared('np-title', { uniform: true })
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
    case 'carplay':
      return (
        <div className="pv-big pv-big-sm">
          <span>{PHONES[s.phone]?.name}</span>
          <small>{s.dongle ? 'Adapter ready' : 'Adapter not found'}</small>
        </div>
      )
    case 'display':
      return (
        <div className="pv-big">
          <span>
            <Shared id="set-brightness">{s.brightness}</Shared>%
          </span>
          <small>{s.mode === 'auto' ? 'Auto theme' : s.mode === 'day' ? 'Day theme' : 'Night theme'}</small>
        </div>
      )
    case 'sound':
      return (
        <div className="pv-big">
          <Shared id="set-volume">{s.volume}</Shared>
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
      if (id.startsWith('video-')) {
        const v = VIDEOS.find((x) => `video-${x.id}` === id)
        return (
          <div className="pv-video">
            <Shared id={`video-frame-${v.id}`} uniform={false} className="pv-video-frame">
              <img src={v.poster} alt="" />
            </Shared>
            <b>{v.title}</b>
            <span>{fmtTime(v.length)}</span>
          </div>
        )
      }
      return null
  }
}

// The right side only carries live state for the selected item: the song,
// the phone. Names live on the ring, nothing is repeated.
// The right side only carries live state for the selected item: the song,
// the phone. Names live on the ring, nothing is repeated.
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
