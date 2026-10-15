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
const shape = (el) => (el.matches('.art, .track-art') ? el : el.querySelector('.art, .track-art')) ?? el
const radiusOf = (el) => parseFloat(getComputedStyle(shape(el)).borderTopLeftRadius) || 0

// "rgba(8, 44, 92, 0.6) 0px 30px 50px -22px" -> { c, v: [x, y, blur, spread] }
function shadowOf(el) {
  const m = getComputedStyle(shape(el)).boxShadow.match(/(rgba?\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px/)
  return m ? { c: m[1], v: [+m[2], +m[3], +m[4], +m[5]] } : null
}

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
    // layout size, not on-screen size: the element may be mid-scale when
    // measured, while its contents are laid out at full size
    width: `${src.offsetWidth}px`,
    height: `${src.offsetHeight}px`,
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
// and one of the destination (what it becomes). The source carries most of
// the flight and the two cross-fade over the last stretch, so typography,
// shadow and detail change over smoothly instead of popping at the end. Corner radius is
// steered per frame so the visible rounding blends from one to the other
// regardless of scale. Positions track the target's live rect, so the
// flight ends exactly where the target has settled.
function fly(fromEl, toEl, uniform, duration) {
  // Fly the visual tile itself (the art), not its wrapper: wrappers can be
  // laid out at a different size than the fixed-size tile they hold.
  const from = shape(fromEl)
  const to = shape(toEl)
  const stage = stageOf(to)
  if (!stage) return
  const sr = stage.getBoundingClientRect()
  const k = sr.width / stage.offsetWidth || 1 // screen px per stage px
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  if (!a.width || !b.width) return
  // base (layout) sizes, read once: the source is often removed from the
  // page mid-flight, after which it measures 0
  const base = new Map([
    [from, [from.offsetWidth, from.offsetHeight]],
    [to, [to.offsetWidth, to.offsetHeight]],
  ])
  const rA = radiusOf(from)
  const rB = radiusOf(to)
  const sA = shadowOf(from)
  const sB = shadowOf(to)

  // Text is the same string at both ends, so it flies as one copy (two
  // cross-fading copies of different widths read as a double image).
  const gA = uniform ? null : makeGhost(from, stage, a, sr, k) // starts at its own size
  const gB = makeGhost(to, stage, b, sr, k) // starts at the target's size, on top
  if (uniform) gB.style.whiteSpace = 'nowrap'
  const shA = gA && shape(gA)
  const shB = shape(gB)
  if (gA) gB.style.opacity = '0'
  fromEl.style.visibility = 'hidden'
  toEl.style.visibility = 'hidden'

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
    for (const [g, src] of gA ? [[gA, from], [gB, to]] : [[gB, to]]) {
      const [bw, bh] = base.get(src)
      const ky = h / (bh * k)
      const kx = uniform ? ky : w / (bw * k) // text keeps its proportions
      g.style.left = `${(x - sr.left) / k}px`
      g.style.top = `${(y - sr.top) / k}px`
      g.style.transform = `scale(${kx}, ${ky})`
      // visible radius and shadow blend source -> target; undo this ghost's
      // own scale so what you see is the blended value, not a scaled one
      const ks = Math.min(kx, ky)
      const sh = g === gA ? shA : shB
      sh.style.borderRadius = `${(rA + (rB - rA) * e) / ks}px`
      if (sA && sB) {
        const v = sA.v.map((n, j) => (n + (sB.v[j] - n) * e) / ks)
        sh.style.boxShadow = `${sB.c} ${v[0]}px ${v[1]}px ${v[2]}px ${v[3]}px`
      }
    }
    if (gA) {
      // the source carries the flight; near the end the destination fades
      // in over it. The source stays opaque underneath so the art is never
      // see-through mid cross-fade.
      const x = Math.max(0, Math.min(1, (p - 0.55) / 0.4))
      gB.style.opacity = String(x * x * (3 - 2 * x))
    }
    if (p < 1) requestAnimationFrame(step)
    else {
      toEl.style.visibility = ''
      fromEl.style.visibility = ''
      gA?.remove()
      gB.remove()
    }
  }
  step(t0) // place both ghosts this frame, before anything paints
}
