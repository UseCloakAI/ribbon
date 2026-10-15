import { useLayoutEffect, useRef } from 'react'

// Shared elements: when an element with a given id mounts while another
// with the same id is still on screen (e.g. the preview's album art as Now
// Playing opens), the element travels from the old spot to the new one
// instead of one fading out and the other fading in.
//
// The move is flown by a snapshot in a top layer of the stage, so parents
// that are fading or scaling (home receding, the app body rising) don't
// dim or drag it. Both real elements stay hidden until it lands.
const live = new Map() // id -> Set<Element>

function stageOf(el) {
  return el.closest('.stage')
}

export function useShared(id, { uniform = false, duration = 0.62 } = {}) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !id) return
    let set = live.get(id)
    if (!set) live.set(id, (set = new Set()))
    const prev = [...set].find((e) => e !== el && e.isConnected)
    set.add(el)
    if (prev) fly(prev, el, uniform, duration)
    return () => set.delete(el)
  }, [id, uniform, duration])
  return ref
}

const SIG = (x) => {
  // the signature curve, cubic-bezier(0.16, 1, 0.3, 1), solved for y(x)
  let lo = 0, hi = 1, t = x
  for (let i = 0; i < 14; i++) {
    const cx = 3 * 0.16 * t * (1 - t) ** 2 + 3 * 0.3 * t * t * (1 - t) + t ** 3
    if (cx < x) lo = t
    else hi = t
    t = (lo + hi) / 2
  }
  return 3 * t * (1 - t) ** 2 + 3 * t * t * (1 - t) + t ** 3
}

// the element that carries the rounding (the art tile), or the node itself
const shape = (el) => (el.matches('.art') ? el : el.querySelector('.art')) ?? el
const radiusOf = (el) => parseFloat(getComputedStyle(shape(el)).borderTopLeftRadius) || 0

// A clone moved to the stage loses styles that came from its old context
// (e.g. `.pv-np b` font size, `.pv-np .art` radius), so pin the computed
// look onto the clone and its shape before it is shown.
const KEEP = ['fontSize', 'fontWeight', 'fontFamily', 'letterSpacing', 'lineHeight', 'color', 'borderRadius', 'boxShadow', 'whiteSpace']
function pin(src, dst) {
  const cs = getComputedStyle(src)
  for (const p of KEEP) dst.style[p] = cs[p]
}

function makeGhost(src, stage, rect, sr, k) {
  const g = src.cloneNode(true)
  pin(src, g)
  if (shape(src) !== src) pin(shape(src), shape(g))
  g.classList.add('shared-ghost')
  Object.assign(g.style, {
    position: 'absolute',
    left: `${(rect.left - sr.left) / k}px`,
    top: `${(rect.top - sr.top) / k}px`,
    width: `${rect.width / k}px`,
    height: `${rect.height / k}px`,
    margin: '0',
    transformOrigin: '0 0',
    pointerEvents: 'none',
    visibility: 'visible',
    zIndex: 35,
  })
  stage.appendChild(g)
  return g
}

// Two snapshots fly together: one of the source (what you were looking at)
// and one of the destination (what it becomes). The destination fades in
// over the source early in the flight, so typography, shadow and detail
// change continuously instead of popping at either end. Corner radius is
// steered per frame so the visible rounding blends from one to the other
// regardless of scale. Positions track the target's live rect, so the
// flight ends exactly where the target has settled.
function fly(from, to, uniform, duration) {
  const stage = stageOf(to)
  if (!stage) return
  const sr = stage.getBoundingClientRect()
  const k = sr.width / stage.offsetWidth || 1 // screen px per stage px
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  if (!a.width || !b.width) return
  const rA = radiusOf(from)
  const rB = radiusOf(to)

  // Text is the same string at both ends, so it flies as one copy (two
  // cross-fading copies of different widths read as a double image).
  const gB = makeGhost(to, stage, b, sr, k) // starts at the target's size
  const gA = uniform ? null : makeGhost(from, stage, a, sr, k) // starts at its own size
  if (uniform) gB.style.whiteSpace = 'nowrap'
  const shA = gA && shape(gA)
  const shB = shape(gB)
  if (gA) gB.style.opacity = '0'
  from.style.visibility = 'hidden'
  to.style.visibility = 'hidden'

  const t0 = performance.now()
  function step(now) {
    const p = Math.max(0, Math.min(1, (now - t0) / (duration * 1000)))
    const e = SIG(p)
    const c = to.getBoundingClientRect()
    // current box, screen px
    const x = a.left + (c.left - a.left) * e
    const y = a.top + (c.top - a.top) * e
    const w = a.width + (c.width - a.width) * e
    const h = a.height + (c.height - a.height) * e
    for (const [g, base] of gA ? [[gA, a], [gB, b]] : [[gB, b]]) {
      const ky = h / base.height
      const kx = uniform ? ky : w / base.width // text keeps its proportions
      g.style.left = `${(x - sr.left) / k}px`
      g.style.top = `${(y - sr.top) / k}px`
      g.style.transform = `scale(${kx}, ${ky})`
      // visible radius blends rA -> rB; undo this ghost's own scale
      const r = rA + (rB - rA) * e
      ;(g === gA ? shA : shB).style.borderRadius = `${r / Math.min(kx, ky)}px`
    }
    if (gA) gB.style.opacity = String(Math.min(1, p / 0.45))
    if (p < 1) requestAnimationFrame(step)
    else {
      to.style.visibility = ''
      from.style.visibility = ''
      gA?.remove()
      gB.remove()
    }
  }
  step(t0) // place both ghosts this frame, before anything paints
}
