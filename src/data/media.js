// Sample library for the prototype. Lengths in seconds.
export const TRACKS = [
  { title: 'Low Tide Static', artist: 'Marlowe Kite', album: 'Coastline Radio', length: 221, hue: 198 },
  { title: 'Overpass Glow', artist: 'Juno Ferraro', album: 'Night Lanes', length: 254, hue: 222 },
  { title: 'Paper Satellites', artist: 'The Wren Sisters', album: 'Paper Satellites', length: 197, hue: 176 },
  { title: 'Mile 88', artist: 'Odessa Vane', album: 'Mile Markers', length: 238, hue: 206 },
  { title: 'Cold Front', artist: 'Halden Moss', album: 'Pressure Systems', length: 263, hue: 190 },
  { title: 'Long Way Round', artist: 'Ines Okafor', album: 'Detour Songs', length: 212, hue: 214 },
  { title: 'Signal Fade', artist: 'Marlowe Kite', album: 'Coastline Radio', length: 186, hue: 202 },
  { title: 'Northbound', artist: 'Juno Ferraro', album: 'Night Lanes', length: 241, hue: 228 },
]

export const STATIONS = [
  { freq: 88.5, name: 'KQED', genre: 'News and talk' },
  { freq: 93.3, name: 'Wave 93', genre: 'Indie' },
  { freq: 96.5, name: 'KOIT', genre: 'Soft rock' },
  { freq: 101.9, name: 'Coast 102', genre: 'Classic hits' },
  { freq: 104.3, name: 'Drive FM', genre: 'Alternative' },
  { freq: 106.1, name: 'KMEL', genre: 'Hip hop' },
]

export const PHONES = [
  { name: 'Ari’s iPhone', model: 'iPhone 16 Pro', last: 'Today' },
  { name: 'Work phone', model: 'iPhone 15', last: '3 days ago' },
  { name: 'Mara’s iPhone', model: 'iPhone 14', last: 'Sep 28' },
]

export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
