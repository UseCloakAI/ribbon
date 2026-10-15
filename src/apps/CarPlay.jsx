import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check, DeviceMobile, WarningCircle } from '@phosphor-icons/react'
import { useAppKnob } from '../lib/appContext.js'
import { setState, useStore } from '../lib/store.js'
import { PHONES } from '../data/media.js'
import { createBridge, STAGES } from '../carplay/bridge.js'
import { C } from '../lib/geo.js'

const STEP_LABELS = { adapter: 'USB adapter', phone: 'iPhone', video: 'Video' }
const ERRORS = {
  'no-adapter': ['No CarPlay adapter found', 'Plug the USB adapter into the Pi, then press to try again.'],
  'not-wired': ['Adapter bridge not wired yet', 'Connect node-carplay in src/carplay/bridge.js, then press to try again.'],
}

// Full-screen CarPlay surface. Opens as a circle growing out of the knob.
export default function CarPlay() {
  const hasAdapter = useStore((s) => s.dongle)
  const phone = PHONES[useStore((s) => s.phone)] ?? PHONES[0]
  const [stage, setStage] = useState('adapter')
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [sent, setSent] = useState(null)
  const [hint, setHint] = useState(true)
  const bridge = useRef(null)

  useEffect(() => {
    const b = createBridge({ hasAdapter })
    bridge.current = b
    const offs = [
      b.on('status', (st) => {
        if (st.stage === 'error') {
          setError(st.reason)
          setState({ carplay: 'error' })
        } else {
          setStage(st.stage)
          setState({ carplay: st.stage === 'streaming' ? 'streaming' : 'connecting' })
        }
      }),
      b.on('sent', (s) => setSent({ ...s, id: performance.now() })),
    ]
    b.start()
    return () => {
      offs.forEach((o) => o())
      b.stop()
      setState({ carplay: 'idle' })
    }
  }, [attempt, hasAdapter])

  useEffect(() => {
    if (stage !== 'streaming') return
    setHint(true)
    const t = setTimeout(() => setHint(false), 3800)
    return () => clearTimeout(t)
  }, [stage])

  useAppKnob((e) => {
    if (error) {
      if (e.type === 'press') {
        setError(null)
        setStage('adapter')
        setAttempt((a) => a + 1)
        return true
      }
      return e.type === 'turn'
    }
    if (stage !== 'streaming') return e.type === 'turn' || e.type === 'press'
    const b = bridge.current
    if (e.type === 'turn') b.send(e.dir > 0 ? 'right' : 'left')
    else if (e.type === 'press') {
      b.send('selectDown')
      setTimeout(() => b.send('selectUp'), 90)
    } else if (e.type === 'back') b.send('back')
    else return false // hold esc / home returns to ribbon
    return true
  })

  const origin = `${C.x}px ${C.y}px`
  return (
    <motion.div
      className="cp"
      initial={{ clipPath: `circle(0px at ${origin})` }}
      animate={{ clipPath: `circle(1400px at ${origin})` }}
      exit={{ clipPath: `circle(0px at ${origin})`, transition: { duration: 0.42, ease: [0.65, 0, 0.35, 1] } }}
      transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
    >
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div key="err" className="cp-center" {...fade}>
            <motion.div
              className="cp-error-icon"
              initial={{ x: 0 }}
              animate={{ x: [0, -12, 10, -6, 0] }}
              transition={{ duration: 0.38, ease: 'easeInOut' }}
            >
              <WarningCircle size={64} weight="duotone" />
            </motion.div>
            <h2 className="cp-title">{ERRORS[error]?.[0]}</h2>
            <p className="cp-sub">{ERRORS[error]?.[1]}</p>
            <p className="cp-keys">
              <kbd>enter</kbd> try again <kbd>esc</kbd> back to ribbon
            </p>
          </motion.div>
        ) : stage !== 'streaming' ? (
          <motion.div key="connect" className="cp-center" {...fade}>
            <div className="cp-pulse">
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ animationDelay: `${i * 0.6}s` }} />
              ))}
              <motion.div
                className="cp-phone"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.25 }}
              >
                <DeviceMobile size={46} weight="duotone" />
              </motion.div>
            </div>
            <h2 className="cp-title">Connecting to {phone.name}</h2>
            <ol className="cp-steps">
              {STAGES.slice(0, 3).map((st) => {
                const idx = STAGES.indexOf(st)
                const cur = STAGES.indexOf(stage)
                const state = idx < cur ? 'done' : idx === cur ? 'active' : 'wait'
                return (
                  <li key={st} className={`cp-step is-${state}`}>
                    <span className="cp-step-mark">
                      <AnimatePresence mode="wait" initial={false}>
                        {state === 'done' ? (
                          <motion.span
                            key="ok"
                            initial={{ scale: 0, rotate: -40 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                          >
                            <Check size={14} weight="bold" />
                          </motion.span>
                        ) : state === 'active' ? (
                          <motion.span key="orb" className="cp-orb" exit={{ scale: 0, transition: { duration: 0.1 } }} />
                        ) : null}
                      </AnimatePresence>
                    </span>
                    {STEP_LABELS[st]}
                  </li>
                )
              })}
            </ol>
          </motion.div>
        ) : (
          <motion.div key="stream" className="cp-stream" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            {/* The adapter's video frames render into this canvas. */}
            <canvas className="cp-canvas" width="1024" height="768" />
            <div className="cp-demo">
              <span className="cp-demo-badge">Demo bridge</span>
              <p>CarPlay video from {phone.model} draws here.</p>
              <p className="cp-demo-sub">Turn and press: commands go to the adapter.</p>
            </div>
            <AnimatePresence>
              {sent && (
                <motion.div
                  key={sent.id}
                  className="cp-sent"
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.4, delay: 0.6 } }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <b>{sent.cmd}</b>
                  <span>{sent.code}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {hint && (
                <motion.div
                  className="cp-hint"
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  Hold <kbd>esc</kbd> to return to ribbon
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const fade = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12, transition: { duration: 0.18 } },
  transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
}
