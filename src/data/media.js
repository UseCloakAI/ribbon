// The library is discovered from the music/ folder at build time; nothing
// about songs is written in code.
//
//   music/<Song Title>/<Song Title>.mp3   the main mix (same name as folder)
//   music/<Song Title>/<anything>.mp3     a stem, named after its file
//                                         (drums.mp3 -> "drums")
//   music/<Song Title>/cover.jpg|png      artwork (optional)
//   music/<Song Title>/info.json          { artist, album, order, hue } (optional)
//
// Any common audio format works for mains and stems. Lengths are read from
// the files at startup.
const AUDIO = import.meta.glob('/music/*/*.{mp3,m4a,aac,wav,ogg,opus,flac}', { eager: true, query: '?url', import: 'default' })
const COVERS = import.meta.glob('/music/*/cover.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' })
const INFO = import.meta.glob('/music/*/info.json', { eager: true, import: 'default' })

const parts = (path) => {
  const [, , folder, file] = path.split('/')
  return { folder, base: file.replace(/\.[^.]+$/, '') }
}
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

function discover() {
  const songs = new Map()
  for (const [path, url] of Object.entries(AUDIO)) {
    const { folder, base } = parts(path)
    if (!songs.has(folder)) songs.set(folder, { files: [] })
    songs.get(folder).files.push({ base, url })
  }
  const out = []
  for (const [folder, { files }] of songs) {
    // main mix: named like the folder, else "main", else the first file
    const main =
      files.find((f) => f.base.toLowerCase() === folder.toLowerCase()) ??
      files.find((f) => f.base.toLowerCase() === 'main') ??
      [...files].sort((a, b) => a.base.localeCompare(b.base))[0]
    const info = INFO[`/music/${folder}/info.json`] ?? {}
    const cover = Object.entries(COVERS).find(([p]) => parts(p).folder === folder)?.[1]
    out.push({
      id: folder,
      title: info.title ?? folder,
      artist: info.artist ?? '',
      album: info.album ?? '',
      order: info.order ?? Infinity,
      hue: info.hue ?? hash(folder) % 360,
      length: info.length ?? 0,
      src: main.url,
      art: cover,
      stems: files
        .filter((f) => f !== main)
        .map((f) => ({ name: f.base, src: f.url }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    })
  }
  return out.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}

export const TRACKS = discover()

export const PHONES = [
  { name: 'Paul’s iPhone', model: 'iPhone 16 Pro', last: 'Today' },
  { name: 'Work phone', model: 'iPhone 15', last: '3 days ago' },
  { name: 'Mara’s iPhone', model: 'iPhone 14', last: 'Sep 28' },
]

export const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
