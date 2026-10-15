import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CornersIn, CornersOut, Pause, Play, SpeakerHigh, Waveform } from '@phosphor-icons/react'
import { useAppKnob, useReadout } from '../lib/appContext.js'
import { bus } from '../lib/bus.js'
import { clamp, getState, setState, useStore } from '../lib/store.js'
import { sfx } from '../lib/sound.js'
import { useShared } from '../lib/shared.js'
import { EASE, SPRING } from '../lib/motion.js'
import { VIDEOS } from '../data/videos.js'
import { fmtTime } from '../data/media.js'

const HIDE_MS = 3000

// mp4 player. Same knob pattern as Now Playing: turn picks a control, press
// uses it; Scrub and Volume grab the knob until you press again. The control
// bar floats over the picture and fades away while playing, coming back on
// any knob input. Fullscreen grows the frame out to the whole screen.
export default function VideoPlayer({ item }) {
  const v = VIDEOS.find((x) => x.id === item.video) ?? VIDEOS[0]
  const video = useRef(null)
  const frame = useShared(`video-frame-${v.id}`, { uniform: false })
  const volume = useStore((s) => s.volume)
  const [playing, setPlaying] = useState(true)
  const [ended, setEnded] = useState(false)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(v.length)
  const [focus, setFocus] = useState(0)
  const [adjust, setAdjust] = useState(null) // null | 'scrub' | 'volume'
  const [scrubT, setScrubT] = useState(0)
  const [full, setFull] = useState(false)
  const [awake, setAwake] = useState(true)
  const hideTimer = useRef(null)
  const lastTurn = useRef(0)

  const controls = [
    { id: 'play', icon: playing ? Pause : Play, label: playing ? 'Pause' : 'Play' },
    { id: 'scrub', icon: Waveform, label: 'Scrub' },
    { id: 'volume', icon: SpeakerHigh, label: 'Volume' },
    { id: 'full', icon: full ? CornersIn : CornersOut, label: full ? 'Exit full screen' : 'Full screen' },
  ]

  // music steps aside while a video plays
  useEffect(() => {
    setState({ playing: false })
  }, [])

  useEffect(() => {
    const el = video.current
    if (!el) return
    el.volume = Math.pow(volume / 100, 1.6) * (adjust === 'scrub' ? 0.4 : 1)
  }, [volume, adjust])

  useEffect(() => {
    const el = video.current
    if (!el) return
    if (playing) el.play().catch(() => setPlaying(false))
    else el.pause()
  }, [playing])

  // controls fade while playing, wake on any input
  const wake = () => {
    setAwake(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setAwake(false), HIDE_MS)
  }
  useEffect(() => {
    wake()
    return () => clearTimeout(hideTimer.current)
  }, [])
  const showControls = awake || !playing || !!adjust || ended

  // fullscreen: FLIP the frame from its old box to the new one
  const box = useRef(null)
  useLayoutEffect(() => {
    const el = frame.current
    if (!el || !box.current) return
    const a = box.current
    const b = el.getBoundingClientRect()
    box.current = null
    if (!b.width) return
    const k = el.offsetWidth ? b.width / el.offsetWidth : 1
    el.animate(
      [
        { transformOrigin: '0 0', transform: `translate(${(a.left - b.left) / k}px, ${(a.top - b.top) / k}px) scale(${a.width / b.width}, ${a.height / b.height})` },
        { transformOrigin: '0 0', transform: 'none' },
      ],
      { duration: 520, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    )
  }, [full, frame])
  // the launcher chrome (circle, clock, hints) steps aside in full screen
  useEffect(() => {
    setState({ videoFull: full })
    return () => setState({ videoFull: false })
  }, [full])
  const toggleFull = () => {
    box.current = frame.current?.getBoundingClientRect() ?? null
    setFull((f) => !f)
  }

  const shown = adjust === 'scrub' ? scrubT : t

  useReadout(
    adjust === 'volume'
      ? { key: 'vvol', value: volume, unit: 'volume' }
      : adjust === 'scrub'
        ? { key: 'vscrub', value: fmtTime(scrubT), unit: 'scrub' }
        : { key: `v-${focus}`, icon: controls[focus].icon },
  )

  useAppKnob((e) => {
    wake()
    if (adjust === 'scrub') {
      if (e.type === 'turn') {
        const now = performance.now()
        const gap = now - lastTurn.current
        lastTurn.current = now
        const step = gap < 60 ? 8 : gap < 120 ? 5 : 2
        const n = clamp(scrubT + e.dir * step, 0, Math.max(0, dur - 0.5))
        if (n === scrubT) bus.emit('bump', e.dir)
        else sfx('tune', n / dur)
        setScrubT(n)
        if (video.current) video.current.currentTime = n
        return true
      }
      if (e.type === 'press' || e.type === 'back') {
        sfx('release')
        setAdjust(null)
        return true
      }
      return false
    }
    if (adjust === 'volume') {
      if (e.type === 'turn') {
        const n = clamp(getState().volume + e.dir * 2, 0, 100)
        if (n === getState().volume) bus.emit('bump', e.dir)
        else sfx('value', n / 100)
        setState({ volume: n })
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
      if (id === 'play') {
        sfx(playing ? 'toggleOff' : 'toggleOn')
        if (ended && video.current) {
          video.current.currentTime = 0
          setEnded(false)
        }
        setPlaying(!playing)
      } else if (id === 'scrub' || id === 'volume') {
        sfx('grab')
        if (id === 'scrub') setScrubT(video.current?.currentTime ?? 0)
        setAdjust(id)
      } else if (id === 'full') {
        sfx('select')
        toggleFull()
      }
      return true
    }
    // back leaves full screen first, then the app
    if (e.type === 'back' && full) {
      toggleFull()
      return true
    }
    return false
  })

  return (
    <div className="vp">
      <div ref={frame} className={`vp-frame ${full ? 'is-full' : ''}`}>
        <video
          ref={video}
          poster={v.poster}
          playsInline
          autoPlay
          onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration || v.length)}
          onEnded={() => {
            setEnded(true)
            setPlaying(false)
          }}
        >
          <source src={v.src} type="video/mp4" />
          {v.webm && <source src={v.webm} type="video/webm" />}
        </video>
        <AnimatePresence>
          {showControls && (
            <motion.div
              className="vp-bar"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10, transition: { duration: 0.3 } }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <div className={`scrub ${adjust === 'scrub' ? 'is-scrubbing' : ''}`}>
                <motion.span
                  className="scrub-fill"
                  animate={{ scaleX: dur ? shown / dur : 0 }}
                  transition={adjust === 'scrub' ? { type: 'spring', stiffness: 500, damping: 40 } : { duration: 0.25, ease: 'linear' }}
                />
                <motion.span
                  className="scrub-thumb"
                  animate={{ left: `${dur ? (shown / dur) * 100 : 0}%`, scale: adjust === 'scrub' ? 1 : 0, opacity: adjust === 'scrub' ? 1 : 0 }}
                  transition={{ left: { type: 'spring', stiffness: 500, damping: 40 }, scale: { type: 'spring', stiffness: 500, damping: 28 } }}
                />
              </div>
              <div className="vp-row">
                <span className="vp-time">{fmtTime(shown)}</span>
                <div className="vp-controls">
                  <motion.span
                    className={`ctl-ring ${adjust ? 'is-grabbed' : ''}`}
                    animate={{ x: focus * 62 }}
                    transition={SPRING.focus}
                  />
                  {controls.map((c) => (
                    <div key={c.id} className="ctl vp-ctl">
                      <c.icon size={24} weight="fill" aria-label={c.label} />
                    </div>
                  ))}
                </div>
                <span className="vp-time">-{fmtTime(Math.max(0, dur - shown))}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
