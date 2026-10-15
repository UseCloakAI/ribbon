// Tiny event bus for visual side effects (wave surge, knob spin, sound)
// that should not re-render React.
const map = new Map()

export const bus = {
  on(type, fn) {
    if (!map.has(type)) map.set(type, new Set())
    map.get(type).add(fn)
    return () => map.get(type).delete(fn)
  },
  emit(type, payload) {
    map.get(type)?.forEach((fn) => fn(payload))
  },
}
