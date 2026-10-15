import { useState } from 'react'
import { motion } from 'motion/react'
import { useAppKnob, useReadout } from '../lib/appContext.js'
import { bus } from '../lib/bus.js'
import { clamp, setState, useStore } from '../lib/store.js'
import KnobList from './KnobList.jsx'
import { sfx } from '../lib/sound.js'
import Shared from './Shared.jsx'

// Shared knob pattern for settings: turn moves focus, press on a value
// "grabs" it (the knob now adjusts it), press or back lets go.
export default function SettingsPanel({ rows, icon }) {
  const s = useStore((x) => x)
  const [index, setIndex] = useState(0)
  const [adjust, setAdjust] = useState(false)
  const row = rows[index]

  const display = (r) => {
    if (r.type === 'range') return r.fmt ? r.fmt(s[r.key]) : s[r.key]
    if (r.type === 'choice') return r.options.find(([v]) => v === s[r.key])?.[1]
    if (r.type === 'toggle') return s[r.key] ? 'On' : 'Off'
    if (r.type === 'info') return typeof r.value === 'function' ? r.value(s) : r.value
    return r.detail
  }

  useReadout(
    adjust
      ? { key: `adj-${row.key}`, value: display(row), unit: row.unit }
      : { key: 'app', icon },
  )

  useAppKnob((e) => {
    if (adjust) {
      if (e.type === 'turn') {
        if (row.type === 'range') {
          const v = clamp(+(s[row.key] + e.dir * row.step).toFixed(2), row.min, row.max)
          if (v === s[row.key]) bus.emit('bump', e.dir)
          else sfx('value', (v - row.min) / (row.max - row.min))
          setState({ [row.key]: v })
        } else {
          const i = row.options.findIndex(([v]) => v === s[row.key])
          const n = i + e.dir
          if (n < 0 || n >= row.options.length) bus.emit('bump', e.dir)
          else {
            sfx('value', n / Math.max(1, row.options.length - 1))
            setState({ [row.key]: row.options[n][0] })
          }
        }
        return true
      }
      if (e.type === 'press' || e.type === 'back') {
        sfx('release')
        setAdjust(false)
        return true
      }
      if (e.type === 'home') setAdjust(false)
      return false
    }
    if (e.type === 'turn') {
      const n = index + e.dir
      if (n < 0 || n >= rows.length) bus.emit('bump', e.dir)
      else setIndex(n)
      return true
    }
    if (e.type === 'press') {
      if (row.type === 'range' || row.type === 'choice') {
        sfx('grab')
        setAdjust(true)
      } else if (row.type === 'toggle') {
        sfx(s[row.key] ? 'toggleOff' : 'toggleOn')
        setState({ [row.key]: !s[row.key] })
      } else if (row.type === 'action') {
        sfx('select')
        row.run()
      }
      else bus.emit('bump', 1)
      return true
    }
    return false
  })

  return (
    <KnobList
      items={rows}
      index={index}
      rowHeight={rows.some((r) => r.type === 'range') ? 84 : 76}
      visible={6}
      keyOf={(r) => r.key ?? r.label}
      render={(r, i, focused) => {
        const grabbed = focused && adjust
        return (
          <div className={`srow ${grabbed ? 'is-grabbed' : ''}`}>
            <div className="srow-top">
              <span className="srow-label">{r.label}</span>
              <span className={`srow-value ${r.type === 'action' ? 'is-action' : ''}`}>
                {r.type === 'toggle' ? (
                  <span className={`switch ${s[r.key] ? 'is-on' : ''}`}>
                    <motion.span animate={{ x: s[r.key] ? 22 : 0 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
                  </span>
                ) : r.type === 'choice' && grabbed ? (
                  <span className="choices">
                    {r.options.map(([v, label]) => (
                      <span key={v} className={`choice ${s[r.key] === v ? 'is-on' : ''}`}>
                        {label}
                      </span>
                    ))}
                  </span>
                ) : (
                  <>
                    <Shared id={`set-${r.key ?? r.label}`}>{display(r)}</Shared>
                    {r.type === 'range' && r.unit && <small>{r.unit}</small>}
                  </>
                )}
              </span>
            </div>
            {r.type === 'range' && (
              <div className="slider" aria-hidden="true">
                <motion.span
                  className="slider-thumb"
                  animate={{ left: `${((s[r.key] - r.min) / (r.max - r.min)) * 100}%`, scale: grabbed ? 1.35 : 1 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                />
              </div>
            )}
          </div>
        )
      }}
    />
  )
}
