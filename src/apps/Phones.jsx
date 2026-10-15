import { useState } from 'react'
import { DeviceMobile, Plus } from '@phosphor-icons/react'
import { useAppKnob, useReadout } from '../lib/appContext.js'
import { bus } from '../lib/bus.js'
import { setState, toast, useStore } from '../lib/store.js'
import { PHONES } from '../data/media.js'
import KnobList from '../components/KnobList.jsx'

const ROWS = [...PHONES.map((p, i) => ({ ...p, i })), { pair: true, name: 'Pair a new iPhone' }]

export default function Phones({ icon }) {
  const preferred = useStore((s) => s.phone)
  const [index, setIndex] = useState(0)
  useReadout({ key: 'app', icon })

  useAppKnob((e) => {
    if (e.type === 'turn') {
      const n = index + e.dir
      if (n < 0 || n >= ROWS.length) bus.emit('bump', e.dir)
      else setIndex(n)
      return true
    }
    if (e.type === 'press') {
      const row = ROWS[index]
      if (row.pair) toast('Plug your iPhone into the adapter to pair')
      else {
        setState({ phone: row.i })
        toast(`${row.name} connects first`)
      }
      return true
    }
    return false
  })

  return (
    <KnobList
      items={ROWS}
      index={index}
      keyOf={(r) => r.name}
      render={(r) => (
        <div className="phone-row">
          <span className="phone-icon">{r.pair ? <Plus size={22} weight="bold" /> : <DeviceMobile size={24} weight="duotone" />}</span>
          <span className="track-text">
            <b>{r.name}</b>
            {!r.pair && (
              <span>
                {r.model}, last used {r.last.toLowerCase()}
              </span>
            )}
          </span>
          {!r.pair && r.i === preferred && <span className="tag">First</span>}
        </div>
      )}
    />
  )
}
