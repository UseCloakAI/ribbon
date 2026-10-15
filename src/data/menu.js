import {
  MusicNotes, Books, Playlist,
  DeviceMobile,
  FilmStrip, MonitorPlay,
  GearSix, SunDim, SpeakerHigh, SlidersHorizontal, Info,
} from '@phosphor-icons/react'
import { VIDEOS } from './videos.js'

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
    id: 'video',
    label: 'Video',
    icon: FilmStrip,
    items: VIDEOS.map((v) => ({ id: `video-${v.id}`, label: v.title, icon: MonitorPlay, app: 'video', video: v.id })),
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
