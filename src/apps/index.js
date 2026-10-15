import NowPlaying from './NowPlaying.jsx'
import Radio from './Radio.jsx'
import Library from './Library.jsx'
import Phones from './Phones.jsx'
import Trip from './Trip.jsx'
import Gauges from './Gauges.jsx'
import { Display, Sound, KnobSettings, Adapter, About } from './settings.jsx'

export const APPS = {
  nowplaying: NowPlaying,
  radio: Radio,
  library: Library,
  phones: Phones,
  dongle: Adapter,
  trip: Trip,
  gauges: Gauges,
  display: Display,
  sound: Sound,
  knob: KnobSettings,
  about: About,
}
