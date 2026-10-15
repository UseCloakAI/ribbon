// What actually has to happen before ribbon is ready. Each job resolves when
// the thing it names is really done; the boot screen shows progress from
// these, not from timers. Every job is capped so a missing file can't hang
// startup.
import { soundsReady } from './sound.js'
import { TRACKS } from '../data/media.js'
import { VIDEOS } from '../data/videos.js'

const image = (src) =>
  new Promise((res) => {
    const i = new Image()
    i.onload = i.onerror = () => res()
    i.src = src
  })
const metadata = (src) =>
  new Promise((res) => {
    const a = new Audio()
    a.preload = 'metadata'
    a.onloadedmetadata = a.onerror = () => res()
    a.src = src
  })
const capped = (p, ms) => Promise.race([p, new Promise((res) => setTimeout(res, ms))])

export const JOBS = [
  { label: 'Loading fonts', run: () => document.fonts?.ready },
  { label: 'Preparing sounds', run: () => soundsReady() },
  { label: 'Loading library', run: () => Promise.all([metadata(TRACKS[0].src), ...TRACKS.filter((t) => t.art).map((t) => image(t.art))]) },
  { label: 'Loading videos', run: () => Promise.all(VIDEOS.map((v) => image(v.poster))) },
  { label: 'Looking for iPhone', run: () => navigator.usb?.getDevices?.().catch(() => {}) },
]

// Starts every job at once; calls back with the done-flags as each finishes.
export function runStartup(onChange) {
  const done = JOBS.map(() => false)
  JOBS.forEach((job, i) =>
    capped(Promise.resolve().then(job.run).catch(() => {}), 6000).then(() => {
      done[i] = true
      onChange([...done])
    }),
  )
}
