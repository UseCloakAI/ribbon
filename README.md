# ribbon

A knob-driven car launcher for Raspberry Pi 4. React + Vite, running full screen in Chromium. Light-sky look with a live wave, and every menu orbits a single knob on the left of the screen.

Stage is **1024 × 768** (4:3, the iPad 2 panel). It scales to fit any screen and letterboxes over the sky.

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
- **Launcher**: knob with detent spin, press squash and ripple, rubber-band at ring ends, loader ring on launch. Wave surges with each turn.
- **Music**: Now Playing (controls + grabbed volume), Radio (0.1 MHz per notch, presets), Library (loading skeleton, then list).
- **CarPlay**: Launch CarPlay (full screen, opens out of the knob, connection stages, error + retry), Phones, Adapter.
- **Drive**: Trip (three meters, reset), Gauges (live demo signal).
- **Settings**: Display (brightness, day / night / auto, wave Full / Calm / Still), Sound, Knob (direction, wheel steps, detent clicks, hints), About (replay startup, reset).

Trip, gauge and library data are samples.

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
  lib/                  knob input, store, geometry, hooks, detent click audio
  data/                 menu tree, sample media
```
