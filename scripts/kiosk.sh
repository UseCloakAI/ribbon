#!/bin/sh
# Serve the built UI and open it full screen on the Pi (Raspberry Pi OS Bookworm).
# Hide the mouse pointer with `unclutter -idle 0` if one is attached.
set -e
cd "$(dirname "$0")/.."
[ -d dist ] || npm run build
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist >/dev/null 2>&1 &
sleep 1
exec "${CHROMIUM:-chromium-browser}" \
  --kiosk --noerrdialogs --disable-infobars --disable-session-crashed-bubble \
  --autoplay-policy=no-user-gesture-required \
  --check-for-update-interval=31536000 \
  http://127.0.0.1:4173/
