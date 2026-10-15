// Videos for the player. Files live in public/video: the mp4, an optional
// WebM fallback (for Chromium builds without H.264) and a poster frame.
const V = (f) => `${import.meta.env.BASE_URL}video/${f}`
export const VIDEOS = [
  { id: 'sky-drift', title: 'Sky Drift', length: 24, src: V('sky-drift.mp4'), webm: V('sky-drift.webm'), poster: V('sky-drift.jpg') },
  { id: 'night-lanes', title: 'Night Lanes', length: 30, src: V('night-lanes.mp4'), webm: V('night-lanes.webm'), poster: V('night-lanes.jpg') },
]
