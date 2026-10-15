import { useEffect, useState } from 'react'
import { useStore } from './store.js'

export const STAGE_W = 1024
export const STAGE_H = 768

// The UI is laid out on a fixed 1024x768 (iPad 2, 4:3) stage and scaled to
// fit whatever panel it runs on; other ratios letterbox over the sky.
export function useStageScale() {
  const calc = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H)
  const [s, setS] = useState(calc)
  useEffect(() => {
    const on = () => setS(calc())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
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
