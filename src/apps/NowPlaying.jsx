import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Pause, Play, SkipBack, SkipForward, SpeakerHigh, Waveform } from '@phosphor-icons/react'
import { useAppKnob, useReadout } from '../lib/appContext.js'
import { bus } from '../lib/bus.js'
import { clamp, getState, setState, useStore } from '../lib/store.js'
import { TRACKS, fmtTime } from '../data/media.js'
import { sfx } from '../lib/sound.js'
import { MIX, seek, setScrubbing, stemOn, toggleStem } from '../lib/player.js'
import { useShared } from '../lib/shared.js'
import { EASE, EASE_IN } from '../lib/motion.js'

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
  const artRef = useShared('np-art')
  const titleRef = useShared('np-title', { uniform: true })
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
  const len = track.length || 1

  // Stems: one switch per stem file in the song's folder, plus the main mix.
  // The knob carries on from the controls into this row.
  const stemsOn = useStore((s) => s.stemsOn)
  const stemNames = track.stems?.length ? [MIX, ...track.stems.map((x) => x.name)] : []
  const total = controls.length + stemNames.length
  const f = Math.min(focus, total - 1)
  const inStems = f >= controls.length
  const stemFocus = f - controls.length
  const isOn = (name) => stemOn({ stemsOn }, track, name)
  const stemLabel = (name) => (name === MIX ? 'Mix' : name)

  const skip = (d) => {
    const s = getState()
    if (d < 0 && s.position > 3) return setState({ position: 0 })
    setDir(d)
    setState({ track: (s.track + d + TRACKS.length) % TRACKS.length, position: 0, playing: true })
  }

  useReadout(
    inStems && !adjust
      ? { key: `stem-${stemNames[stemFocus]}`, value: isOn(stemNames[stemFocus]) ? 'On' : 'Off', unit: stemLabel(stemNames[stemFocus]) }
      : adjust === 'volume'
      ? { key: 'vol', value: volume, unit: 'volume' }
      : adjust === 'scrub'
        ? { key: 'scrub', value: fmtTime(scrubT), unit: 'scrub' }
        : { key: `np-${f}`, icon: controls[f].icon },
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
        const t = clamp(scrubT + e.dir * step, 0, len - 1)
        if (t === scrubT) bus.emit('bump', e.dir)
        else sfx('tune', t / len)
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
      const n = f + e.dir
      if (n < 0 || n >= total) bus.emit('bump', e.dir)
      else setFocus(n)
      return true
    }
    if (e.type === 'press' && inStems) {
      const on = toggleStem(track, stemNames[stemFocus])
      sfx(on ? 'toggleOn' : 'toggleOff')
      return true
    }
    if (e.type === 'press') {
      const id = controls[f].id
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
      <div className="np-art" ref={artRef}>
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
            <h3 className="np-title">
              <span ref={titleRef}>{track.title}</span>
            </h3>
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
              animate={{ scaleX: shown / len }}
              transition={adjust === 'scrub' ? { type: 'spring', stiffness: 500, damping: 40 } : { duration: 0.9, ease: 'linear' }}
            />
            <motion.span
              className="scrub-thumb"
              animate={{ left: `${(shown / len) * 100}%`, scale: adjust === 'scrub' ? 1 : 0, opacity: adjust === 'scrub' ? 1 : 0 }}
              transition={{ left: adjust === 'scrub' ? { type: 'spring', stiffness: 500, damping: 40 } : { duration: 0.9, ease: 'linear' }, scale: { type: 'spring', stiffness: 500, damping: 28 }, opacity: { duration: 0.15 } }}
            />
          </div>
          <div className="np-times">
            <span>{fmtTime(shown)}</span>
            <span>-{fmtTime(len - shown)}</span>
          </div>
        </div>
        <div className="np-controls">
          <motion.span
            className={`ctl-ring ${adjust ? 'is-grabbed' : ''}`}
            animate={{ x: Math.min(f, controls.length - 1) * 86, opacity: inStems ? 0 : 1, scale: inStems ? 0.8 : 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          />
          {controls.map((c, i) => (
            <div key={c.id} className={`ctl ${i === f ? 'is-focus' : ''} ${c.id === 'play' ? 'is-primary' : ''} ${i === f && adjust ? 'is-grabbed' : ''}`}>
              <c.icon size={c.id === 'play' ? 34 : 26} weight="fill" aria-label={c.label} />
              {c.id === 'volume' && <span className="ctl-vol">{volume}</span>}
            </div>
          ))}
        </div>
        {stemNames.length > 0 && (
          <div className="stems" aria-label="Stems">
            {stemNames.map((name, i) => (
              <motion.div
                key={`${track.id}-${name}`}
                className={`stem ${isOn(name) ? 'is-on' : ''} ${inStems && i === stemFocus ? 'is-focus' : ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE, delay: i * 0.035 }}
              >
                <span className="stem-dot">
                  <motion.span animate={{ scale: isOn(name) ? 1 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 26 }} />
                </span>
                {stemLabel(name)}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
