// CarPlay bridge. ribbon does not implement CarPlay itself: on the Pi a USB
// CarPlay adapter (Carlinkit CPC200-CCPA class) does the iPhone side and
// streams H.264 video back. node-carplay drives that adapter from the
// browser over WebUSB, so the launcher only has to:
//   1. start the adapter and show connection progress
//   2. render the video stream on a full-screen surface
//   3. translate knob events into adapter commands
//
// Command codes follow node-carplay's CommandMapping. Verify them against
// the version you install before shipping.
export const COMMANDS = {
  left: 100,
  right: 101,
  selectDown: 104,
  selectUp: 105,
  back: 106,
  home: 200,
}

export const STAGES = ['adapter', 'phone', 'video', 'streaming']

function emitter() {
  const subs = new Map()
  return {
    on(type, fn) {
      if (!subs.has(type)) subs.set(type, new Set())
      subs.get(type).add(fn)
      return () => subs.get(type).delete(fn)
    },
    emit(type, data) {
      subs.get(type)?.forEach((fn) => fn(data))
    },
  }
}

// Demo bridge: walks the real connection stages on a timer so the
// launcher flow, loading states and knob mapping can be built today.
export function createMockBridge({ hasAdapter }) {
  const em = emitter()
  const timers = []
  const at = (ms, fn) => timers.push(setTimeout(fn, ms))
  return {
    kind: 'demo',
    on: em.on,
    start() {
      em.emit('status', { stage: 'adapter' })
      at(1100, () => {
        if (!hasAdapter) return em.emit('status', { stage: 'error', reason: 'no-adapter' })
        em.emit('status', { stage: 'phone' })
      })
      if (!hasAdapter) return
      at(2300, () => em.emit('status', { stage: 'video' }))
      at(3100, () => em.emit('status', { stage: 'streaming' }))
    },
    send(cmd) {
      em.emit('sent', { cmd, code: COMMANDS[cmd] })
    },
    stop() {
      timers.forEach(clearTimeout)
    },
  }
}

// Real adapter. Wire node-carplay's web build here:
//   - request the USB device (vendor 0x1314) with navigator.usb
//   - start the CarPlay worker, forward its video frames to a <canvas>
//     through WebCodecs, audio to an AudioContext
//   - send(cmd) maps to carplay.sendKey(COMMANDS[cmd])
// Until then it reports itself as not wired so the UI shows the error state.
export function createAdapterBridge() {
  const em = emitter()
  return {
    kind: 'adapter',
    on: em.on,
    start() {
      em.emit('status', { stage: 'adapter' })
      setTimeout(() => em.emit('status', { stage: 'error', reason: 'not-wired' }), 600)
    },
    send() {},
    stop() {},
  }
}

export const BRIDGE_KIND = import.meta.env.VITE_CARPLAY === 'adapter' ? 'adapter' : 'demo'

export function createBridge(opts) {
  return BRIDGE_KIND === 'adapter' ? createAdapterBridge(opts) : createMockBridge(opts)
}
