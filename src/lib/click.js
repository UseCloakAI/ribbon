// Detent click through WebAudio: a short filtered noise burst per notch,
// a lower thunk on press. Stands in for a physical detent until the real knob.
let ctx
let noise

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    const len = Math.floor(ctx.sampleRate * 0.03)
    noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 6)
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export function tick(kind = 'turn') {
  const a = audio()
  if (!a) return
  const src = a.createBufferSource()
  src.buffer = noise
  const f = a.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = kind === 'turn' ? 3200 : 900
  f.Q.value = kind === 'turn' ? 6 : 2
  const g = a.createGain()
  g.gain.value = kind === 'turn' ? 0.22 : 0.35
  src.connect(f).connect(g).connect(a.destination)
  src.start()
}
