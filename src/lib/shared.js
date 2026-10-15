import { useLayoutEffect, useRef } from 'react'
import { animate } from 'motion'
import { EASE } from './motion.js'

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

  const dx = (b.left - a.left) / k
  const dy = (b.top - a.top) / k
  animate(
    ghost,
    { transform: [`translate(0px, 0px) scale(${sx}, ${sy})`, `translate(${dx}px, ${dy}px) scale(1, 1)`] },
    { duration, ease: EASE },
  ).then(() => {
    to.style.visibility = ''
    from.style.visibility = ''
    ghost.remove()
  })
}
