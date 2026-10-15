import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Pause, Play, SkipBack, SkipForward, SpeakerHigh } from '@phosphor-icons/react'
import { useAppKnob, useReadout } from '../lib/appContext.js'
import { bus } from '../lib/bus.js'
import { clamp, getState, setState, useStore } from '../lib/store.js'
import { TRACKS, fmtTime } from '../data/media.js'

export function AlbumArt({ track, size = 236 }) {
  const h = track.hue
  return (
    <div
      className="art"
      style={{
        width: size,
        height: size,
        '--s': `${size}px`,
        background: `radial-gradient(120% 90% at 25% 15%, hsl(${h} 85% 82%), hsl(${h} 62% 52%) 52%, hsl(${h + 24} 58% 28%))`,
      }}
    >
      <span className="art-sheen" />
      {size >= 120 && <span className="art-title">{track.album}</span>}
    </div>
  )
}

export function Bars({ playing, count = 5 }) {
  return (
    <span className={`bars ${playing ? 'is-playing' : ''}`} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ animationDelay: `${-i * 0.23}s` }} />
      ))}
    </span>
  )
}

export default function NowPlaying({ icon }) {
  const trackIdx = useStore((s) => s.track)
  const playing = useStore((s) => s.playing)
  const position = useStore((s) => s.position)
  const volume = useStore((s) => s.volume)
  const [focus, setFocus] = useState(1)
  const [adjust, setAdjust] = useState(false)
  const [dir, setDir] = useState(1)
  const track = TRACKS[trackIdx]

  const controls = [
    { id: 'prev', icon: SkipBack, label: 'Previous' },
    { id: 'play', icon: playing ? Pause : Play, label: playing ? 'Pause' : 'Play' },
    { id: 'next', icon: SkipForward, label: 'Next' },
    { id: 'volume', icon: SpeakerHigh, label: 'Volume' },
  ]

  const skip = (d) => {
    const s = getState()
    if (d < 0 && s.position > 3) return setState({ position: 0 })
    setDir(d)
    setState({ track: (s.track + d + TRACKS.length) % TRACKS.length, position: 0, playing: true })
  }

  useReadout(adjust ? { key: 'vol', value: volume, unit: 'volume' } : { key: `np-${focus}`, icon: controls[focus].icon })

  useAppKnob((e) => {
    if (adjust) {
      if (e.type === 'turn') {
        const v = clamp(getState().volume + e.dir * 2, 0, 100)
        if (v === getState().volume) bus.emit('bump', e.dir)
        setState({ volume: v })
        return true
      }
      if (e.type === 'press' || e.type === 'back') {
        setAdjust(false)
        return true
      }
      return false
    }
    if (e.type === 'turn') {
      const n = focus + e.dir
      if (n < 0 || n >= controls.length) bus.emit('bump', e.dir)
      else setFocus(n)
      return true
    }
    if (e.type === 'press') {
      const id = controls[focus].id
      if (id === 'prev') skip(-1)
      if (id === 'next') skip(1)
      if (id === 'play') setState({ playing: !getState().playing })
      if (id === 'volume') setAdjust(true)
      return true
    }
    return false
  })

  return (
    <div className="np">
      <div className="np-art">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={trackIdx}
            custom={dir}
            initial={{ opacity: 0, x: dir * 60, rotate: dir * 4, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, rotate: 0, scale: playing ? 1 : 0.95 }}
            exit={{ opacity: 0, x: dir * -60, rotate: dir * -4, scale: 0.94, transition: { duration: 0.2, ease: [0.3, 0, 1, 1] } }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          >
            <AlbumArt track={track} />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="np-meta">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={trackIdx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <h3 className="np-title">{track.title}</h3>
            <p className="np-artist">
              {track.artist}
              <span>{track.album}</span>
            </p>
          </motion.div>
        </AnimatePresence>
        <div className="np-progress">
          <div className="scrub">
            <motion.span
              className="scrub-fill"
              animate={{ scaleX: position / track.length }}
              transition={{ duration: 0.9, ease: 'linear' }}
            />
          </div>
          <div className="np-times">
            <span>{fmtTime(position)}</span>
            <Bars playing={playing} />
            <span>-{fmtTime(track.length - position)}</span>
          </div>
        </div>
        <div className="np-controls">
          <motion.span
            className={`ctl-ring ${adjust ? 'is-grabbed' : ''}`}
            animate={{ x: focus * 94 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          />
          {controls.map((c, i) => (
            <div key={c.id} className={`ctl ${i === focus ? 'is-focus' : ''} ${c.id === 'play' ? 'is-primary' : ''} ${i === focus && adjust ? 'is-grabbed' : ''}`}>
              <c.icon size={c.id === 'play' ? 34 : 26} weight="fill" aria-label={c.label} />
              {c.id === 'volume' && <span className="ctl-vol">{volume}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
