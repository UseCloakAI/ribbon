import {
  MusicNotes, Books, Playlist,
  DeviceMobile, DeviceMobileSpeaker, Usb,
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
    items: [
      { id: 'carplay', label: 'Launch CarPlay', sub: 'Your iPhone on this screen', icon: DeviceMobile, fullscreen: true },
      { id: 'phones', label: 'Phones', sub: 'Paired iPhones', icon: DeviceMobileSpeaker },
      { id: 'dongle', label: 'Adapter', sub: 'USB CarPlay adapter', icon: Usb },
    ],
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
