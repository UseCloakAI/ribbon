import { useEffect, useRef } from 'react'
import { bus } from './bus.js'
import { getState } from './store.js'

// Knob vocabulary: turn(+1/-1), press, back, home.
// Keyboard stands in for the encoder today. A GPIO encoder exposed as
// REL_WHEEL (see README) arrives as wheel events, so it works unchanged.
const NEXT = new Set(['ArrowRight', 'ArrowDown', 'd', 's', ']'])
const PREV = new Set(['ArrowLeft', 'ArrowUp', 'a', 'w', '['])
const PRESS = new Set(['Enter', ' ', 'e'])
const BACK = new Set(['Escape', 'Backspace', 'q'])
const HOLD_MS = 650
const WHEEL_STEP = { fine: 30, normal: 60, coarse: 110 }

export function useKnobInput(dispatch) {
  const ref = useRef(dispatch)
  ref.current = dispatch

  useEffect(() => {
    let backTimer = null
    let backHeld = false
    let wheelAcc = 0
    let wheelReset = null

    const fire = (evt) => {
      const s = getState()
      if (evt.type === 'turn' && s.invert) evt = { ...evt, dir: -evt.dir }
      bus.emit('knob', evt)
      ref.current(evt)
    }

    const onKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (NEXT.has(k)) fire({ type: 'turn', dir: 1 })
      else if (PREV.has(k)) fire({ type: 'turn', dir: -1 })
      else if (PRESS.has(k)) {
        if (!e.repeat) fire({ type: 'press' })
      } else if (BACK.has(k)) {
        if (e.repeat) {
          e.preventDefault()
          return
        }
        backHeld = false
        clearTimeout(backTimer)
        backTimer = setTimeout(() => {
          backHeld = true
          fire({ type: 'home' })
        }, HOLD_MS)
      } else if (k === 'h' || k === 'Home') fire({ type: 'home' })
      else return
      e.preventDefault()
    }

    const onKeyUp = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (!BACK.has(k)) return
      clearTimeout(backTimer)
      if (!backHeld) fire({ type: 'back' })
      backHeld = false
    }

    const onWheel = (e) => {
      e.preventDefault()
      const step = WHEEL_STEP[getState().sensitivity] ?? 60
      wheelAcc += e.deltaY + e.deltaX
      clearTimeout(wheelReset)
      wheelReset = setTimeout(() => (wheelAcc = 0), 220)
      while (Math.abs(wheelAcc) >= step) {
        const dir = Math.sign(wheelAcc)
        wheelAcc -= dir * step
        fire({ type: 'turn', dir })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      clearTimeout(backTimer)
      clearTimeout(wheelReset)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('wheel', onWheel)
    }
  }, [])
}
