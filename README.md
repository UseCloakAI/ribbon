# ribbon

A knob-driven car launcher for Raspberry Pi 4. React + Vite, running full screen in Chromium. Light-sky look with a live wave. A large plain circle sits cut in half by the left edge of the screen, and every menu flows around it.

Default screen is **4:3** (1024 × 768, the iPad 2 panel), shown as a true 4:3 picture with bars on wider displays. Settings › Display › Screen › **Fit display** widens the layout to the display's ratio instead (never narrower than 4:3); the right-hand content follows the right edge.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static build in dist/
npm run preview    # serve dist/
```

On the Pi: `scripts/kiosk.sh` builds if needed, serves `dist/` locally and opens Chromium in kiosk mode.

## Controls

The keyboard stands in for the knob until the hardware is wired.

| Knob | Keys |
| --- | --- |
| Turn clockwise | `→` `↓` `D` `S` `]`, wheel down |
| Turn counter-clockwise | `←` `↑` `A` `W` `[`, wheel up |
| Press | `Enter` `Space` `E` |
| Back | `Esc` `Backspace` `Q` (on release) |
| Home | hold `Esc` (650 ms), `H` |

Two rings orbit the knob: categories on the inner ring, their items on the outer ring. Turn to move, press to go in or launch, back to step out. Inside apps the same pattern repeats: turn moves focus, press on a value grabs it (the knob now adjusts it and its face shows the value), press or back lets go. Any key skips the startup.

## What's in the prototype

- **Startup**: a thread of light draws across the dark, the sky comes up and the thread becomes the wave, wordmark rises, short load, hand-off to the knob as the orbits fan out.
- **Launcher**: the circle stays still while the options flow around it. Selection is the item in the 3 o'clock slot, full ink and slightly larger. Press makes the circle breathe, ring ends rubber-band, the rim fills as the launch loader, and the circle shows a value only while you're adjusting one. The right side shows only live state (the song, the frequency, the phone). Key hints fade after a few seconds. Wave surges with each turn.
- **Music**: Now Playing (controls + grabbed volume), Radio (0.1 MHz per notch, presets), Library (loading skeleton, then list).
- **CarPlay**: Launch CarPlay (full screen, opens out of the knob, connection stages, error + retry), Phones, Adapter.
- **Drive**: Trip (three meters, reset), Gauges (live demo signal).
- **Settings**: Display (screen 4:3 / fit, brightness, day / night / auto, wave Full / Calm / Still), Sound (volume, balance, tone, interface sounds), Knob (direction, wheel steps, hints), About (replay startup, reset).

Trip, gauge and library data are samples.

## Sound

All sound is synthesized (`src/lib/sound.js`), then pre-rendered once at startup through an `OfflineAudioContext` into stereo buffers, so playback is a single buffer per sound and costs almost nothing on a Pi. Voices are two-operator FM (glass bells, kalimba plucks), shaped noise, and a detuned saw pad, all through a stereo convolution room with early reflections and a damped tail. Each sound is peak-normalized to its own target, so the knob's constant companions sit quietest and the moments sit fullest.

The palette lives in G major pentatonic. Navigation is close and dry: a glass tick per notch, a felt thock at a ring's end, a rising fifth to step in, falling to step out. Values you grab play a pluck pitched onto the scale by the value, so any sweep sounds musical; radio tuning breathes static between stations and rings when you land on one. Moments open into the room: startup (a Gmaj9 pad swelling with the sky, a chime as the wordmark lands, a low tone as the circle arrives), app launch (air rising while the rim fills, then a glass chord), CarPlay connecting. Interface sounds and their volume live in Settings › Sound.

Browsers block audio until the first key press, so the startup sound only plays on a fresh load in kiosk mode (`scripts/kiosk.sh` passes `--autoplay-policy=no-user-gesture-required`). In dev, `__sfx('launch')` in the console plays any sound.

## CarPlay

ribbon doesn't implement CarPlay itself. A USB CarPlay adapter (Carlinkit CPC200-CCPA class) handles the iPhone and streams H.264 back; [node-carplay](https://github.com/rhysmorgan134/node-CarPlay) drives that adapter from the browser over WebUSB. `src/carplay/bridge.js` is the seam:

- `createMockBridge` (default) walks the real stages (adapter, iPhone, video, streaming) on a timer and echoes knob commands on screen.
- `createAdapterBridge` is where node-carplay plugs in. Build with `VITE_CARPLAY=adapter npm run build` to select it.

Knob mapping while CarPlay is streaming: turn → `left` / `right`, press → `selectDown` + `selectUp`, back → `back`, hold back → return to ribbon. Codes follow node-carplay's `CommandMapping`; check them against the version you install.

## Knob hardware

A GPIO rotary encoder can show up as a scroll wheel, which ribbon already reads. In `/boot/firmware/config.txt`:

```
dtoverlay=rotary-encoder,pin_a=17,pin_b=27,relative_axis=1,linux_axis=8
dtoverlay=gpio-key,gpio=22,keycode=28,label="knob-press"
dtoverlay=gpio-key,gpio=23,keycode=1,label="knob-back"
```

`linux_axis=8` is `REL_WHEEL`, keycode 28 is Enter and 1 is Esc. Verify on the device: if libinput doesn't treat the encoder as a pointer, map its events to arrow keys with a small evdev → uinput script instead. Wheel step size is adjustable under Settings › Knob.

## Preview on GitHub Pages

`.github/workflows/pages.yml` builds and deploys on every push to `main` or `claude/**`. One-time setup: repo **Settings › Pages › Source: GitHub Actions**. The build uses relative asset paths, so it works under `/ribbon/`.

## Layout

```
src/
  App.jsx               launcher state, knob routing, home orbits
  components/           Sky (wave canvas), Knob, Orbit, Boot, StatusBar, Preview,
                        AppFrame, KnobList, SettingsPanel, Hints, Toast
  apps/                 NowPlaying, Radio, Library, CarPlay, Phones, Trip, Gauges, settings
  carplay/bridge.js     adapter seam + command map
  lib/                  knob input, store, geometry, hooks, sound design
  data/                 menu tree, sample media
```
