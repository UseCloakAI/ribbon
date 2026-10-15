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

function fly(from, to, uniform, duration) {
  const stage = stageOf(to)
  if (!stage) return
  const sr = stage.getBoundingClientRect()
  const k = sr.width / stage.offsetWidth || 1 // screen px per stage px
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  if (!a.width || !b.width) return

  const ghost = to.cloneNode(true)
  ghost.classList.add('shared-ghost')
  // copy the target's look; it is positioned in stage px at the old rect
  const w = b.width / k
  const h = b.height / k
  Object.assign(ghost.style, {
    position: 'absolute',
    left: `${(a.left - sr.left) / k}px`,
    top: `${(a.top - sr.top) / k}px`,
    width: `${w}px`,
    height: `${h}px`,
    margin: '0',
    transformOrigin: '0 0',
    pointerEvents: 'none',
    zIndex: 35,
  })
  let sx = a.width / b.width
  let sy = a.height / b.height
  if (uniform) sx = sy = a.height / b.height
  stage.appendChild(ghost)
  from.style.visibility = 'hidden'
  to.style.visibility = 'hidden'

  // The target is often still settling (its screen rising, scaling in), so
  // where it is now is not where it will rest. Each frame the ghost is
  // steered toward the target's *current* rect, so it lands exactly on it.
  const sx0 = sx
  const sy0 = sy
  const t0 = performance.now()
  const ease = (x) => {
    // the signature curve, cubic-bezier(0.16, 1, 0.3, 1), solved for y(x)
    let lo = 0, hi = 1, t = x
    for (let i = 0; i < 14; i++) {
      const cx = 3 * 0.16 * t * (1 - t) ** 2 + 3 * 0.3 * t * t * (1 - t) + t ** 3
      if (cx < x) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return 3 * 1 * t * (1 - t) ** 2 + 3 * 1 * t * t * (1 - t) + t ** 3
  }
  const step = (now) => {
    const p = Math.min(1, (now - t0) / (duration * 1000))
    const e = ease(p)
    const c = to.getBoundingClientRect()
    const cw = c.width / k
    const ch = c.height / k
    // position: from the old spot toward wherever the target is now
    const x = ((a.left - sr.left) / k) * (1 - e) + ((c.left - sr.left) / k) * e
    const y = ((a.top - sr.top) / k) * (1 - e) + ((c.top - sr.top) / k) * e
    // size: from the old size toward the target's current size
    const gx = (sx0 * (1 - e) + 1 * e) * (cw / w)
    const gy = (sy0 * (1 - e) + 1 * e) * (ch / h)
    ghost.style.left = `${x}px`
    ghost.style.top = `${y}px`
    ghost.style.transform = `scale(${gx}, ${gy})`
    if (p < 1) requestAnimationFrame(step)
    else {
      to.style.visibility = ''
      from.style.visibility = ''
      ghost.remove()
    }
  }
  ghost.style.transform = `scale(${sx0}, ${sy0})`
  requestAnimationFrame(step)
}
