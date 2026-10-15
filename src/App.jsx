import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Sky from './components/Sky.jsx'
import Knob from './components/Knob.jsx'
import Boot from './components/Boot.jsx'
import StatusBar from './components/StatusBar.jsx'
import Hints from './components/Hints.jsx'
import Toast from './components/Toast.jsx'
import Preview from './components/Preview.jsx'
import AppFrame from './components/AppFrame.jsx'
import { useOrbit, OrbitNode, CategoryNode, ItemNode } from './components/Orbit.jsx'
import CarPlay from './apps/CarPlay.jsx'
import { APPS } from './apps/index.js'
import { CATEGORIES, DEFAULT_CATEGORY } from './data/menu.js'
import { AppCtx } from './lib/appContext.js'
import { bus } from './lib/bus.js'
import { useKnobInput } from './lib/useKnobInput.js'
import { useMode, useStage } from './lib/hooks.js'
import { useStore } from './lib/store.js'
import { C, R_CAT, R_ITEM, STEP_CAT, STEP_ITEM } from './lib/geo.js'
import { sfx } from './lib/sound.js'

const LAUNCH_MS = 640

export default function App() {
  const aspect = useStore((s) => s.aspect)
  const { scale, width } = useStage(aspect)
  const mode = useMode()
  const brightness = useStore((s) => s.brightness)
  const bootKey = useStore((s) => s.bootKey)

  const [booting, setBooting] = useState(true)
  const [entering, setEntering] = useState(true)
  const [layer, setLayer] = useState('cats')
  const [cat, setCat] = useState(DEFAULT_CATEGORY)
  const [items, setItems] = useState(() => CATEGORIES.map(() => 0))
  const [catDir, setCatDir] = useState(1)
  const [app, setApp] = useState(null)
  const [launching, setLaunching] = useState(null)
  const [readout, setReadout] = useState(null)
  const appHandler = useRef(null)
  const launchTimer = useRef(null)

  const st = useRef()
  st.current = { booting, layer, cat, items, app, launching }

  // Settings > About > Replay startup
  useEffect(() => {
    if (!bootKey) return
    setApp(null)
    setLayer('cats')
    setEntering(true)
    setBooting(true)
  }, [bootKey])

  const finishBoot = useCallback(() => {
    setBooting(false)
    sfx('arrive')
    setTimeout(() => setEntering(false), 1600)
  }, [])

  const closeApp = () => {
    setApp(null)
    setReadout(null)
    appHandler.current = null
  }

  const launch = (item) => {
    sfx('launch')
    setLaunching(item.id)
    clearTimeout(launchTimer.current)
    launchTimer.current = setTimeout(() => {
      setApp(item)
      setLaunching(null)
    }, LAUNCH_MS)
  }

  useKnobInput((e) => {
    const s = st.current
    if (s.booting) {
      if (e.type !== 'turn') bus.emit('boot:skip')
      return
    }
    if (s.launching) return
    if (s.app) {
      if (appHandler.current?.(e)) return
      if (e.type === 'back' || e.type === 'home') {
        sfx('close')
        closeApp()
        if (e.type === 'home') setLayer('cats')
      }
      return
    }
    const list = CATEGORIES[s.cat].items
    if (e.type === 'turn') {
      if (s.layer === 'cats') {
        const n = s.cat + e.dir
        if (n < 0 || n >= CATEGORIES.length) return bus.emit('bump', e.dir)
        setCatDir(e.dir)
        setCat(n)
      } else {
        const n = s.items[s.cat] + e.dir
        if (n < 0 || n >= list.length) return bus.emit('bump', e.dir)
        setItems((a) => a.map((v, i) => (i === s.cat ? n : v)))
      }
    } else if (e.type === 'press') {
      if (s.layer === 'cats') {
        sfx('enter')
        setLayer('items')
      } else launch(list[s.items[s.cat]])
    } else if (e.type === 'back') {
      if (s.layer === 'items') setLayer('cats')
      else bus.emit('bump', -1)
    } else if (e.type === 'home') {
      setLayer('cats')
    }
  })

  const ctx = useMemo(
    () => ({
      register(fn) {
        appHandler.current = fn
        return () => {
          if (appHandler.current === fn) appHandler.current = null
        }
      },
      setReadout,
    }),
    [],
  )

  const category = CATEGORIES[cat]
  const item = category.items[items[cat]]
  const AppView = app && !app.fullscreen ? APPS[app.id] : null
  const fullscreen = app?.fullscreen
  const hintContext = booting ? null : app ? 'app' : layer

  return (
    <AppCtx.Provider value={ctx}>
      <div className="ribbon" data-mode={mode}>
        {/* The frame is the stage's on-screen footprint: the whole display in
            fit mode, a true 4:3 picture with bars around it in 4:3 mode. */}
        <div className="frame" style={{ width: width * scale, height: 768 * scale }}>
          <Sky mode={mode} />
        </div>
        <div className="stage" style={{ width, transform: `translate(-50%, -50%) scale(${scale})` }}>
          {!booting && (
            <>
              <AnimatePresence>{!fullscreen && <StatusBar key="status" entering={entering} />}</AnimatePresence>

              <AnimatePresence>
                {!app && (
                  <Home
                    key="home"
                    layer={layer}
                    cat={cat}
                    catDir={catDir}
                    items={items}
                    launching={launching}
                    entering={entering}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {AppView && (
                  <AppFrame key={app.id} title={app.label}>
                    <AppView icon={app.icon} />
                  </AppFrame>
                )}
              </AnimatePresence>

              <Knob
                readout={app ? readout : null}
                loading={!!launching}
                hidden={fullscreen}
                entering={entering}
              />

              <AnimatePresence>{fullscreen && <CarPlay key="carplay" />}</AnimatePresence>

              <Hints context={fullscreen ? null : hintContext} />
              <Toast />
            </>
          )}
        </div>
        {booting && <Boot key={bootKey} onDone={finishBoot} />}
        <div className="dim" style={{ opacity: ((100 - brightness) / 100) * 0.72 }} aria-hidden="true" />
      </div>
    </AppCtx.Provider>
  )
}

function Home({ layer, cat, catDir, items, launching, entering }) {
  const catPos = useOrbit(cat)
  const category = CATEGORIES[cat]
  const item = category.items[items[cat]]


  return (
    <motion.div
      className="home"
      style={{ transformOrigin: `${C.x}px ${C.y}px` }}
      initial={entering ? false : { opacity: 0, scale: 0.82 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.82, transition: { duration: 0.26, ease: [0.3, 0, 1, 1] } }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="tracks"
        style={{ left: C.x, top: C.y }}
        initial={entering ? { opacity: 0, scale: 0.5 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: entering ? 0.15 : 0 }}
        aria-hidden="true"
      >
        <span className={`track-ring ${layer === 'cats' ? 'is-on' : ''}`} style={{ width: R_CAT * 2, height: R_CAT * 2 }} />
        <span className={`track-ring ${layer === 'items' ? 'is-on' : ''}`} style={{ width: R_ITEM * 2, height: R_ITEM * 2 }} />
      </motion.div>


      <nav className={`orbit orbit-cats ${layer === 'items' ? 'is-parked' : ''}`} style={{ left: C.x, top: C.y }} aria-label="Categories">
        {CATEGORIES.map((c, i) => (
          <OrbitNode key={c.id} pos={catPos} i={i} radius={R_CAT} step={STEP_CAT} range={84} className="node">
            {(focus) => <CategoryNode cat={c} focus={focus} layer={layer} index={i} entering={entering} />}
          </OrbitNode>
        ))}
      </nav>

      <div className="orbit" style={{ left: C.x, top: C.y }}>
        <AnimatePresence initial={false} custom={catDir}>
          <ItemRing key={category.id} category={category} index={items[cat]} layer={layer} entering={entering} dir={catDir} />
        </AnimatePresence>
      </div>

      <Preview item={item} launching={launching} entering={entering} />
    </motion.div>
  )
}

const ringVariants = {
  enter: (dir) => ({ rotate: dir * 18, opacity: 0 }),
  center: { rotate: 0, opacity: 1 },
  exit: (dir) => ({ rotate: dir * -14, opacity: 0, transition: { duration: 0.2, ease: [0.3, 0, 1, 1] } }),
}

function ItemRing({ category, index, layer, entering, dir }) {
  const pos = useOrbit(index)
  return (
    <motion.div
      className={`ring ${layer === 'items' ? 'is-live' : ''}`}
      custom={dir}
      variants={ringVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      aria-label={`${category.label} items`}
    >
      {category.items.map((it, i) => (
        <OrbitNode key={it.id} pos={pos} i={i} radius={R_ITEM} step={STEP_ITEM} range={62} className="node node-item">
          {(focus) => <ItemNode item={it} focus={focus} layer={layer} index={i} entering={entering} />}
        </OrbitNode>
      ))}
    </motion.div>
  )
}
