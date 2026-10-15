import { useSyncExternalStore } from 'react'
import { bus } from './bus.js'

const KEY = 'ribbon.settings.v1'
const SETTINGS = {
  volume: 42,
  brightness: 92,
  aspect: '4:3', // 4:3 | fit
  mode: 'day', // day | night | auto (follows the clock)
  wave: 'full', // full | calm | still
  sounds: true,
  uiVolume: 60,
  hints: true,
  invert: false,
  sensitivity: 'normal', // fine | normal | coarse
  balance: 0,
  bass: 2,
  treble: 1,
  dongle: true,
  phone: 0,
}

let saved = {}
try {
  saved = JSON.parse(localStorage.getItem(KEY)) || {}
} catch {
  saved = {}
}

let state = {
  ...SETTINGS,
  ...saved,
  track: 0,
  playing: true,
  position: 0,
  carplay: 'idle',
  videoFull: false,
  stemsOn: {}, // { [trackId]: { [stemName]: bool } } // idle | connecting | streaming | error
  toast: null,
  bootKey: 0,
}

const listeners = new Set()

function persist() {
  const out = {}
  for (const k of Object.keys(SETTINGS)) out[k] = state[k]
  try {
    localStorage.setItem(KEY, JSON.stringify(out))
  } catch {
    /* storage can be unavailable in kiosk/private modes */
  }
}

export function getState() {
  return state
}

export function setState(patch) {
  const next = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...next }
  if (Object.keys(next).some((k) => k in SETTINGS)) persist()
  listeners.forEach((l) => l())
}

export function subscribe(l) {
  listeners.add(l)
  return () => listeners.delete(l)
}

// Selectors must return primitives (or stable references).
export function useStore(selector) {
  return useSyncExternalStore(subscribe, () => selector(state))
}

let toastTimer
export function toast(text) {
  clearTimeout(toastTimer)
  setState({ toast: { text, id: Date.now() } })
  bus.emit('toast')
  toastTimer = setTimeout(() => setState({ toast: null }), 2200)
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
