import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { bus } from '../lib/bus.js'
import { useReducedMotionPref } from '../lib/hooks.js'
import { audioLocked, sfx, whenReady } from '../lib/sound.js'
import { EASE, EASE_IN, EASE_IO } from '../lib/motion.js'

const WORD = 'ribbon'.split('')
// the point's inhale before it flashes: slow in, quick release
const EASE_SOFT_IN = [0.5, 0, 0.75, 0]
const STEPS = ['Waking up', 'Loading library', 'Looking for iPhone', 'Ready']

// A thread that is straight, then becomes the wave. Same command structure
// so the path can morph between them.
const STRAIGHT = 'M0 100 C 160 100, 300 100, 450 100 S 760 100, 1000 100'
const WAVE = 'M0 118 C 160 52, 300 46, 450 104 S 760 176, 1000 86'

// Glints land on the boot sound's high bell notes (0.75s, 1.2s, 1.8s, 2.4s).
const GLINTS = [
  { t: 0.75, x: 19, y: 55 },
  { t: 1.2, x: 43, y: 61 },
  { t: 1.8, x: 64, y: 56 },
  { t: 2.4, x: 84, y: 51 },
]

// The startup, scored to the startup sound:
//   standby  (audio locked) a point of light breathes until a key is pressed
//   0.00s    the point gathers itself, then flashes and stretches into a thread
//   0.60s    dawn spreads out from the thread, the thread bends into a wave
//   0.75s    the live wave sweeps in and takes over; glints ride the bell notes
//   1.15s    on the chime, the wordmark rises out of the horizon line
//   1.75s    a short load runs under it
//   3.40s    the word lifts away and hands off to the circle
export default function Boot({ onDone }) {
  const reduced = useReducedMotionPref()
  const [standby] = useState(() => audioLocked())
  const [phase, setPhase] = useState(standby ? -1 : 0)
  const [step, setStep] = useState(0)
  const [glints, setGlints] = useState([])

  useEffect(() => {
    const k = reduced ? 0.4 : 1
    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(fn, ms * k))
    let started = false
    let finished = false
    let revealed = false
    const reveal = () => {
      if (revealed) return
      revealed = true
      bus.emit('wave:reveal')
    }
    const finish = () => {
      if (finished) return
      finished = true
      reveal()
      setPhase(4)
      timers.push(setTimeout(onDone, 380))
    }
    const start = () => {
      if (started) return
      started = true
      setPhase(0)
      whenReady('boot').then(() => !finished && sfx('boot'))
      at(600, () => setPhase(1))
      at(750, reveal)
      GLINTS.forEach((g, i) => at(g.t * 1000, () => setGlints((x) => [...x, i])))
      at(1150, () => {
        setPhase(2)
        sfx('chime')
      })
      at(1750, () => setPhase(3))
      at(2100, () => setStep(1))
      at(2500, () => setStep(2))
      at(2950, () => setStep(3))
      at(3400, finish)
    }
    // From standby any key (or a tap) starts it; once running, press skips.
    const off = bus.on('boot:key', (e) => {
      if (!started) start()
      else if (e.type !== 'turn') finish()
    })
    const tap = () => (started ? finish() : start())
    window.addEventListener('pointerdown', tap)
    if (!standby) start()
    return () => {
      finished = true
      timers.forEach(clearTimeout)
      off()
      window.removeEventListener('pointerdown', tap)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const on = (p) => phase >= p

  return (
    <div className="boot" aria-label="Starting ribbon">
      {/* night, opening from the horizon outward */}
      <motion.div
        className="boot-dark"
        initial={{ '--r': '0%', opacity: 1 }}
        animate={{ '--r': on(1) ? '150%' : '0%', opacity: on(2) ? 0 : 1 }}
        transition={{ '--r': { duration: 1.8, ease: EASE_IO }, opacity: { duration: 1.2, ease: EASE_IO, delay: 0.3 } }}
      />

      {/* standby: one point of light, breathing */}
      <AnimatePresence>
        {phase === -1 && (
          <motion.p
            className="boot-standby"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6, transition: { duration: 0.2, ease: EASE_IN } }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.9 }}
          >
            Press any key
          </motion.p>
        )}
      </AnimatePresence>
      <motion.span
        className="boot-point"
        initial={{ scale: 0, opacity: 0 }}
        animate={
          phase === -1
            ? { scale: [0.85, 1.25, 0.85], opacity: [0.55, 1, 0.55] }
            : { scale: [1, 0.6, 2.2, 0], opacity: [1, 1, 1, 0] }
        }
        transition={
          phase === -1
            ? { duration: 2.8, ease: 'easeInOut', repeat: Infinity }
            : { duration: 0.75, times: [0, 0.2, 0.5, 1], ease: [EASE_SOFT_IN, EASE, EASE] }
        }
      />

      {/* the thread: stretches out of the point, then bends into the wave */}
      <motion.div
        className="boot-thread"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={on(0) ? { scaleX: 1, opacity: on(1) ? 0 : 1 } : { scaleX: 0, opacity: 0 }}
        transition={{
          scaleX: { duration: 0.95, ease: EASE, delay: 0.12 },
          opacity: on(1) ? { duration: 1.1, ease: EASE_IO, delay: 0.55 } : { duration: 0.15, delay: 0.12 },
        }}
      >
        <svg viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
          <motion.path
            className="boot-thread-bloom"
            initial={{ d: STRAIGHT }}
            animate={{ d: on(1) ? WAVE : STRAIGHT }}
            transition={{ duration: 1.3, ease: EASE_IO }}
          />
          <motion.path
            initial={{ d: STRAIGHT }}
            animate={{ d: on(1) ? WAVE : STRAIGHT }}
            transition={{ duration: 1.3, ease: EASE_IO }}
          />
        </svg>
      </motion.div>

      {/* glints on the bell notes */}
      {glints.map((i) => (
        <motion.span
          key={i}
          className="boot-glint"
          style={{ left: `${GLINTS[i].x}%`, top: `${GLINTS[i].y}%` }}
          initial={{ scale: 0, rotate: -30, opacity: 0 }}
          animate={{ scale: [0, 1, 0.2], rotate: [-30, 15, 45], opacity: [0, 1, 0] }}
          transition={{ duration: 1.1, times: [0, 0.35, 1], ease: [EASE, EASE_IN] }}
        />
      ))}

      {/* the wordmark rises out of the horizon on the chime */}
      <div className="boot-center">
        <AnimatePresence>
          {on(2) && phase < 4 && (
            <motion.div
              key="word"
              className="boot-lockup"
              exit={{ opacity: 0, y: -18, transition: { duration: 0.34, ease: EASE_IN, delay: 0.06 } }}
            >
              <motion.h1
                className="boot-word"
                aria-label="ribbon"
                initial={{ scale: 1.06 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.8, ease: EASE }}
              >
                {WORD.map((ch, i) => (
                  <span key={i} className="boot-mask" aria-hidden="true">
                    <motion.span
                      initial={{ y: '105%', opacity: 0 }}
                      animate={{ y: '0%', opacity: 1 }}
                      transition={{ duration: 0.9, ease: EASE, delay: i * 0.045 }}
                    >
                      {ch}
                    </motion.span>
                  </span>
                ))}
              </motion.h1>
              <motion.div
                className="boot-load"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: on(3) ? 1 : 0, y: on(3) ? 0 : 6 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <div className="boot-line">
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: on(3) ? (step + 1) / STEPS.length : 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                  />
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={step}
                    className="boot-step"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6, transition: { duration: 0.12, ease: EASE_IN } }}
                    transition={{ duration: 0.28, ease: EASE }}
                  >
                    {STEPS[step]}
                  </motion.span>
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
