import { useEffect, useState } from 'react'
import { useStore } from './store.js'

export const STAGE_W = 1024
export const STAGE_H = 768

// The stage is always 768 units tall. In 4:3 mode it is 1024 wide (the
// iPad 2 panel) and letterboxes over the sky; in fit mode it widens to the
// display's ratio (never narrower than 4:3) and right-anchored UI follows.
export function useStage(aspect) {
  const calc = () => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = aspect === 'fit' ? Math.max(STAGE_W, Math.round((STAGE_H * vw) / vh)) : STAGE_W
    return { width, scale: Math.min(vw / width, vh / STAGE_H) }
  }
  const [s, setS] = useState(calc)
  useEffect(() => {
    const on = () => setS(calc())
    on()
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspect])
  return s
}

export function useClock(interval = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

// auto follows the clock: day 7:00 to 19:00, night otherwise.
export function useMode() {
  const mode = useStore((s) => s.mode)
  const now = useClock(30000)
  if (mode !== 'auto') return mode
  const h = now.getHours()
  return h >= 7 && h < 19 ? 'day' : 'night'
}

export function useReducedMotionPref() {
  const q = '(prefers-reduced-motion: reduce)'
  const [r, setR] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setR(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return r
}
