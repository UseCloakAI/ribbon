import { useShared } from '../lib/shared.js'

// Wrap anything that also exists on the screen you came from or go to.
// Same id on both sides = it travels between them instead of cross-fading.
export default function Shared({ id, uniform = true, as: Tag = 'span', className = '', children, style }) {
  const ref = useShared(id, { uniform })
  return (
    <Tag ref={ref} className={`shared ${className}`} style={style}>
      {children}
    </Tag>
  )
}
