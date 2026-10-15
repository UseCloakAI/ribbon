import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { bus } from '../lib/bus.js'
import { useReducedMotionPref } from '../lib/hooks.js'
import { sfx, whenReady } from '../lib/sound.js'

const WORD = 'ribbon'.split('')
const STEPS = ['Waking the knob', 'Loading library', 'Looking for iPhone', 'Ready']

// Startup: a single thread of light draws across the dark, the sky comes up
// behind it and the thread becomes the wave, the wordmark rises, a short
// load runs, then everything hands off to the knob.
export default function Boot({ onDone }) {
  const reduced = useReducedMotionPref()
  const [phase, setPhase] = useState(0)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const k = reduced ? 0.4 : 1
    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(fn, ms * k))
    let finished = false
    whenReady('boot').then(() => !finished && sfx('boot'))
    let revealed = false
    const finish = () => {
      if (finished) return
      finished = true
      setPhase(4)
      timers.push(setTimeout(onDone, 420))
    }
    at(520, () => {
      setPhase(1)
      revealed = true
      bus.emit('wave:reveal')
    })
    at(1150, () => {
      setPhase(2)
      sfx('chime')
    })
    at(1700, () => setPhase(3))
    at(2050, () => setStep(1))
    at(2450, () => setStep(2))
    at(2900, () => setStep(3))
    at(3350, finish)
    const off = bus.on('boot:skip', () => {
      if (!revealed) {
        revealed = true
        bus.emit('wave:reveal')
      }
      finish()
    })
    return () => {
      finished = true
      timers.forEach(clearTimeout)
      off()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="boot" aria-label="Starting ribbon">
      <motion.div
        className="boot-dark"
        initial={{ opacity: 1 }}
        animate={{ opacity: phase >= 1 ? 0 : 1 }}
        transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
      />
      <svg className="boot-thread" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
        <motion.path
          d="M0 120 C 160 40, 300 40, 450 110 S 760 190, 1000 80"
          initial={{ pathLength: 0, opacity: 1 }}
          animate={{ pathLength: 1, opacity: phase >= 1 ? 0 : 1 }}
          transition={{ pathLength: { duration: 0.75, ease: [0.65, 0, 0.35, 1] }, opacity: { duration: 0.9, delay: 0.2 } }}
        />
      </svg>
      <AnimatePresence>
        {phase >= 2 && phase < 4 && (
          <motion.div
            className="boot-center"
            exit={{ opacity: 0, y: -18, transition: { duration: 0.32, ease: [0.3, 0, 1, 1] } }}
          >
            <h1 className="boot-word" aria-label="ribbon">
              {WORD.map((ch, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 26, rotate: 6 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20, delay: i * 0.05 }}
                >
                  {ch}
                </motion.span>
              ))}
            </h1>
            <motion.div
              className="boot-load"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="boot-line">
                <motion.span
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: phase >= 3 ? (step + 1) / STEPS.length : 0 }}
                  transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                />
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={step}
                  className="boot-step"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                >
                  {STEPS[step]}
                </motion.span>
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
