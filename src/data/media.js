// The library. Audio and artwork live in public/music;
// tracks without embedded artwork get a generated cover. Lengths in seconds.
const M = (f) => `${import.meta.env.BASE_URL}music/${f}`
export const TRACKS = [
  { title: 'You Saved Me', artist: 'UPPERROOM', album: 'You Saved Me', length: 281, hue: 206, src: M('you-saved-me.mp3') },
  { title: 'Remember The Time', artist: 'Michael Jackson', album: 'Dangerous', length: 239, hue: 32, src: M('remember-the-time.mp3'), art: M('remember-the-time.png') },
  { title: 'Give Me Jesus (Spontaneous)', artist: 'Bethel Music, Abbie Gamboa, Jenn Johnson', album: 'Live', length: 706, hue: 198, src: M('give-me-jesus.mp3') },
  { title: "Thank God I'm Free", artist: 'Ray Ernandez, SOCAL WRSHP CO.', album: "Summer Camp '26", length: 311, hue: 40, src: M('thank-god-im-free.mp3'), art: M('thank-god-im-free.jpg') },
  { title: 'The Wonderful Blood', artist: 'Tiffany Hudson', album: 'The Wonderful Blood', length: 525, hue: 350, src: M('the-wonderful-blood.mp3') },
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
