import SettingsPanel from '../components/SettingsPanel.jsx'
import { getState, setState } from '../lib/store.js'
import { BRIDGE_KIND } from '../carplay/bridge.js'

const signed = (v) => (v > 0 ? `+${v}` : `${v}`)

export function Display({ icon }) {
  return (
    <SettingsPanel
      icon={icon}
      rows={[
        { key: 'brightness', label: 'Brightness', type: 'range', min: 10, max: 100, step: 5, unit: '%' },
        { key: 'mode', label: 'Theme', type: 'choice', options: [['auto', 'Auto'], ['day', 'Day'], ['night', 'Night']] },
        { key: 'wave', label: 'Wave', type: 'choice', options: [['full', 'Full'], ['calm', 'Calm'], ['still', 'Still']] },
      ]}
    />
  )
}

export function Sound({ icon }) {
  return (
    <SettingsPanel
      icon={icon}
      rows={[
        { key: 'volume', label: 'Volume', type: 'range', min: 0, max: 100, step: 2 },
        { key: 'balance', label: 'Balance', type: 'range', min: -10, max: 10, step: 1, fmt: (v) => (v === 0 ? 'Center' : v < 0 ? `Left ${-v}` : `Right ${v}`) },
        { key: 'bass', label: 'Bass', type: 'range', min: -6, max: 6, step: 1, unit: 'dB', fmt: signed },
        { key: 'treble', label: 'Treble', type: 'range', min: -6, max: 6, step: 1, unit: 'dB', fmt: signed },
      ]}
    />
  )
}

export function KnobSettings({ icon }) {
  return (
    <SettingsPanel
      icon={icon}
      rows={[
        { key: 'sensitivity', label: 'Wheel steps', type: 'choice', options: [['fine', 'Fine'], ['normal', 'Normal'], ['coarse', 'Coarse']] },
        { key: 'invert', label: 'Reverse direction', type: 'toggle' },
        { key: 'clicks', label: 'Detent clicks', type: 'toggle' },
        { key: 'hints', label: 'Show key hints', type: 'toggle' },
      ]}
    />
  )
}

export function Adapter({ icon }) {
  return (
    <SettingsPanel
      icon={icon}
      rows={[
        { label: 'Status', type: 'info', value: (s) => (s.dongle ? 'Connected' : 'Not found') },
        { label: 'Adapter', type: 'info', value: 'CPC200-CCPA' },
        { label: 'Video', type: 'info', value: '1024 × 768, 60 fps' },
        { label: 'Bridge', type: 'info', value: BRIDGE_KIND === 'adapter' ? 'node-carplay, WebUSB' : 'Demo' },
        { key: 'dongle', label: 'Simulate adapter', type: 'toggle' },
      ]}
    />
  )
}

export function About({ icon }) {
  return (
    <SettingsPanel
      icon={icon}
      rows={[
        { label: 'ribbon', type: 'info', value: `Version ${__APP_VERSION__}` },
        { label: 'Screen', type: 'info', value: '1024 × 768' },
        { label: 'Input', type: 'info', value: 'Keyboard, wheel, encoder' },
        { label: 'Replay startup', type: 'action', detail: 'Press', run: () => setState({ bootKey: getState().bootKey + 1 }) },
        {
          label: 'Reset settings',
          type: 'action',
          detail: 'Press',
          run: () => {
            try {
              localStorage.removeItem('ribbon.settings.v1')
            } catch {
              /* ignore */
            }
            location.reload()
          },
        },
      ]}
    />
  )
}
