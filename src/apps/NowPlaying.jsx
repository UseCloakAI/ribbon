import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Pause, Play, SkipBack, SkipForward, SpeakerHigh, Waveform } from '@phosphor-icons/react'
import { useAppKnob, useReadout } from '../lib/appContext.js'
import { bus } from '../lib/bus.js'
import { clamp, getState, setState, useStore } from '../lib/store.js'
import { TRACKS, fmtTime } from '../data/media.js'
import { sfx } from '../lib/sound.js'
import { musicTempo, seek, setScrubbing } from '../lib/player.js'
import { EASE_IN } from '../lib/motion.js'

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
      {track.art && <img className="art-img" src={track.art} alt="" />}
      {!track.art && <span className="art-sheen" />}
      {size >= 120 && !track.art && <span className="art-title">{track.title}</span>}
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
  const [adjust, setAdjust] = useState(null) // null | 'volume' | 'scrub'
  const [scrubT, setScrubT] = useState(0)
  const lastTurn = useRef(0)
  const [bpm, setBpm] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setBpm(musicTempo().bpm), 1000)
    return () => clearInterval(id)
  }, [])
  const [dir, setDir] = useState(1)
  const track = TRACKS[trackIdx]

  const controls = [
    { id: 'prev', icon: SkipBack, label: 'Previous' },
    { id: 'play', icon: playing ? Pause : Play, label: playing ? 'Pause' : 'Play' },
    { id: 'next', icon: SkipForward, label: 'Next' },
    { id: 'volume', icon: SpeakerHigh, label: 'Volume' },
    { id: 'scrub', icon: Waveform, label: 'Scrub' },
  ]
  const shown = adjust === 'scrub' ? scrubT : position

  const skip = (d) => {
    const s = getState()
    if (d < 0 && s.position > 3) return setState({ position: 0 })
    setDir(d)
    setState({ track: (s.track + d + TRACKS.length) % TRACKS.length, position: 0, playing: true })
  }

  useReadout(
    adjust === 'volume'
      ? { key: 'vol', value: volume, unit: 'volume' }
      : adjust === 'scrub'
        ? { key: 'scrub', value: fmtTime(scrubT), unit: 'scrub' }
        : { key: `np-${focus}`, icon: controls[focus].icon },
  )

  useEffect(() => () => setScrubbing(false), [])

  const endScrub = () => {
    setScrubbing(false)
    setAdjust(null)
  }

  useAppKnob((e) => {
    if (adjust === 'scrub') {
      if (e.type === 'turn') {
        // quick turns cover more ground: 2s per notch, up to 8s when spinning
        const now = performance.now()
        const gap = now - lastTurn.current
        lastTurn.current = now
        const step = gap < 60 ? 8 : gap < 120 ? 5 : 2
        const t = clamp(scrubT + e.dir * step, 0, track.length - 1)
        if (t === scrubT) bus.emit('bump', e.dir)
        else sfx('tune', t / track.length)
        setScrubT(t)
        seek(t)
        return true
      }
      if (e.type === 'press' || e.type === 'back' || e.type === 'home') {
        sfx('release')
        endScrub()
        return e.type !== 'home'
      }
      return false
    }
    if (adjust) {
      if (e.type === 'turn') {
        const v = clamp(getState().volume + e.dir * 2, 0, 100)
        if (v === getState().volume) bus.emit('bump', e.dir)
        else sfx('value', v / 100)
        setState({ volume: v })
        return true
      }
      if (e.type === 'press' || e.type === 'back') {
        sfx('release')
        setAdjust(null)
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
      sfx(id === 'volume' || id === 'scrub' ? 'grab' : id === 'play' ? (getState().playing ? 'toggleOff' : 'toggleOn') : 'select')
      if (id === 'prev') skip(-1)
      if (id === 'next') skip(1)
      if (id === 'play') setState({ playing: !getState().playing })
      if (id === 'volume') setAdjust('volume')
      if (id === 'scrub') {
        setScrubT(getState().position)
        setScrubbing(true)
        setAdjust('scrub')
      }
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
            exit={{ opacity: 0, x: dir * -60, rotate: dir * -4, scale: 0.94, transition: { duration: 0.2, ease: EASE_IN } }}
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
          <div className={`scrub ${adjust === 'scrub' ? 'is-scrubbing' : ''}`}>
            <motion.span
              className="scrub-fill"
              animate={{ scaleX: shown / track.length }}
              transition={adjust === 'scrub' ? { type: 'spring', stiffness: 500, damping: 40 } : { duration: 0.9, ease: 'linear' }}
            />
            <motion.span
              className="scrub-thumb"
              animate={{ left: `${(shown / track.length) * 100}%`, scale: adjust === 'scrub' ? 1 : 0, opacity: adjust === 'scrub' ? 1 : 0 }}
              transition={{ left: adjust === 'scrub' ? { type: 'spring', stiffness: 500, damping: 40 } : { duration: 0.9, ease: 'linear' }, scale: { type: 'spring', stiffness: 500, damping: 28 }, opacity: { duration: 0.15 } }}
            />
          </div>
          <div className="np-times">
            <span>{fmtTime(shown)}</span>
            <span className="np-bpm">{bpm ? `${bpm} BPM` : <Bars playing={playing} />}</span>
            <span>-{fmtTime(track.length - shown)}</span>
          </div>
        </div>
        <div className="np-controls">
          <motion.span
            className={`ctl-ring ${adjust ? 'is-grabbed' : ''}`}
            animate={{ x: focus * 86 }}
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
