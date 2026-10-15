import { createContext, useContext, useEffect, useRef } from 'react'

// Apps get the knob first. A handler returns true when it consumed the
// event; unconsumed back/home fall through to the launcher.
export const AppCtx = createContext(null)

export function useAppKnob(handler) {
  const ctx = useContext(AppCtx)
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => ctx.register((e) => ref.current(e)), [ctx])
}

// What the knob face shows while this app is open.
export function useReadout(readout) {
  const ctx = useContext(AppCtx)
  const sig = readout ? `${readout.key}|${readout.value ?? ''}|${readout.unit ?? ''}` : ''
  const ref = useRef(readout)
  ref.current = readout
  useEffect(() => {
    ctx.setReadout(ref.current)
  }, [sig, ctx])
}

export function useApp() {
  return useContext(AppCtx)
}
