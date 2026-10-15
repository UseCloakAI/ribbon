import { motion } from 'motion/react'
import { useClock } from '../lib/hooks.js'
import { useStore } from '../lib/store.js'
import { TRACKS, fmtTime } from '../data/media.js'
import { AlbumArt, Bars } from '../apps/NowPlaying.jsx'
import { EASE, EASE_IN } from '../lib/motion.js'
import Shared from './Shared.jsx'

const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

// Standby: back out of the top of home and the launcher steps aside for a
// large clock over the wave, with what's playing underneath. The clock
// travels down from the status bar and the album art from the preview.
// Any knob input returns home.
export default function Standby() {
  const now = useClock(1000)
  const trackIdx = useStore((s) => s.track)
  const playing = useStore((s) => s.playing)
  const position = useStore((s) => s.position)
  const t = TRACKS[trackIdx]
  const h = now.getHours() % 12 || 12
  const m = String(now.getMinutes()).padStart(2, '0')

  return (
    <motion.section
      className="standby"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3, ease: EASE_IN } }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="sb-clock">
        <Shared id="clock" className="sb-time">
          {h}
          <span className="clock-colon">:</span>
          {m}
        </Shared>
        <motion.span
          className="sb-date"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
        >
          {dateFmt.format(now)}
        </motion.span>
      </div>

      <motion.div
        className="sb-np"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10, transition: { duration: 0.2, ease: EASE_IN } }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
      >
        <Shared id="np-art" uniform={false} as="div">
          <AlbumArt track={t} size={84} />
        </Shared>
        <div className="sb-np-text">
          <span className="sb-np-label">{playing ? 'Now Playing' : 'Paused'}</span>
          <b>{t.title}</b>
          <span>{t.artist}</span>
          <div className="sb-np-progress">
            <div className="scrub">
              <motion.span className="scrub-fill" animate={{ scaleX: position / t.length }} transition={{ duration: 0.9, ease: 'linear' }} />
            </div>
            <span className="sb-np-time">
              <Bars playing={playing} count={4} /> {fmtTime(position)} / {fmtTime(t.length)}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.section>
  )
}
