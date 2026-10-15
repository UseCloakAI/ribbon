import {
  MusicNotes, Books, Playlist,
  DeviceMobile,
  Gauge, Path, Speedometer,
  GearSix, SunDim, SpeakerHigh, SlidersHorizontal, Info,
} from '@phosphor-icons/react'

// The two orbits: categories ride the inner ring, their items the outer ring.
export const CATEGORIES = [
  {
    id: 'music',
    label: 'Music',
    icon: MusicNotes,
    items: [
      { id: 'nowplaying', label: 'Now Playing', sub: 'What’s on right now', icon: Playlist },
      { id: 'library', label: 'Library', sub: 'Songs on this car', icon: Books },
    ],
  },
  {
    id: 'carplay',
    label: 'CarPlay',
    icon: DeviceMobile,
    // no sub-items: pressing the category launches CarPlay straight away
    items: [],
    app: { id: 'carplay', label: 'CarPlay', sub: 'Your iPhone on this screen', icon: DeviceMobile, fullscreen: true },
  },
  {
    id: 'drive',
    label: 'Drive',
    icon: Gauge,
    items: [
      { id: 'trip', label: 'Trip', sub: 'Distance, time, economy', icon: Path },
      { id: 'gauges', label: 'Gauges', sub: 'Live engine readouts', icon: Speedometer },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: GearSix,
    items: [
      { id: 'display', label: 'Display', sub: 'Brightness, theme, wave', icon: SunDim },
      { id: 'sound', label: 'Sound', sub: 'Volume, balance, tone', icon: SpeakerHigh },
      { id: 'knob', label: 'Knob', sub: 'Direction, feel, hints', icon: SlidersHorizontal },
      { id: 'about', label: 'About', sub: 'Version and system', icon: Info },
    ],
  },
]

export const DEFAULT_CATEGORY = 1
