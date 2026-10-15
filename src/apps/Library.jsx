import { useEffect, useState } from 'react'
import { useAppKnob, useReadout } from '../lib/appContext.js'
import { bus } from '../lib/bus.js'
import { setState, toast, useStore } from '../lib/store.js'
import { TRACKS, fmtTime } from '../data/media.js'
import KnobList, { SkeletonList } from '../components/KnobList.jsx'
import { Bars } from './NowPlaying.jsx'

export default function Library() {
  const [ready, setReady] = useState(false)
  const [index, setIndex] = useState(0)
  const current = useStore((s) => s.track)
  const playing = useStore((s) => s.playing)

  // Simulated scan of the USB/SD library so the loading state is visible.
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 900)
    return () => clearTimeout(t)
  }, [])

  useReadout({ key: 'lib', value: ready ? index + 1 : '…', unit: `of ${TRACKS.length}` })

  useAppKnob((e) => {
    if (!ready) return e.type !== 'back' && e.type !== 'home'
    if (e.type === 'turn') {
      const n = index + e.dir
      if (n < 0 || n >= TRACKS.length) bus.emit('bump', e.dir)
      else setIndex(n)
      return true
    }
    if (e.type === 'press') {
      setState({ track: index, position: 0, playing: true })
      toast(`Playing ${TRACKS[index].title}`)
      return true
    }
    return false
  })

  if (!ready) return <SkeletonList rows={6} />

  return (
    <KnobList
      items={TRACKS}
      index={index}
      visible={7}
      rowHeight={72}
      keyOf={(t) => t.title}
      render={(t, i) => (
        <div className="track-row">
          <span
            className="track-art"
            style={{ background: `linear-gradient(140deg, hsl(${t.hue} 80% 78%), hsl(${t.hue + 20} 58% 36%))` }}
          />
          <span className="track-text">
            <b>{t.title}</b>
            <span>{t.artist}</span>
          </span>
          <span className="track-len">{i === current ? <Bars playing={playing} count={4} /> : fmtTime(t.length)}</span>
        </div>
      )}
    />
  )
}
