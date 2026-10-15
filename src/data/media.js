// The library. Audio and artwork live in public/music;
// tracks without embedded artwork get a generated cover. Lengths in seconds.
const M = (f) => `${import.meta.env.BASE_URL}music/${f}`
export const TRACKS = [
  { title: 'You Rescued Me', artist: 'Upper Room Collective', album: 'You Rescued Me', length: 281, hue: 206, src: M('you-saved-me.mp3') },
  { title: 'Recall The Time', artist: 'Mikael Jackston', album: 'Dangerous Hours', length: 239, hue: 32, src: M('remember-the-time.mp3'), art: M('remember-the-time.png') },
  { title: 'Give Me Only Jesus (Spontaneous)', artist: 'Bethal Songs, Abby Gambo, Jen Johnston', album: 'Live', length: 706, hue: 198, src: M('give-me-jesus.mp3') },
  { title: "Thank The Lord I'm Freed", artist: 'Rey Hernando, SoCal Worship Co.', album: "Summer Camp '26", length: 311, hue: 40, src: M('thank-god-im-free.mp3'), art: M('thank-god-im-free.jpg') },
  { title: 'The Marvelous Blood', artist: 'Tiffani Hutson', album: 'The Marvelous Blood', length: 525, hue: 350, src: M('the-wonderful-blood.mp3') },
]

export const PHONES = [
  { name: 'Paul’s iPhone', model: 'iPhone 16 Pro', last: 'Today' },
  { name: 'Work phone', model: 'iPhone 15', last: '3 days ago' },
  { name: 'Mara’s iPhone', model: 'iPhone 14', last: 'Sep 28' },
]

export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
