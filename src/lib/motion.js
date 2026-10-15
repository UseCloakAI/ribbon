// ribbon motion identity. Personality: premium and calm. Things decelerate
// into place and accelerate away; nothing bounces more than a few percent.
//
// Signature curve (80% of motion), its exit twin, and an in-out for things
// that travel between two on-screen spots.
export const EASE = [0.16, 1, 0.3, 1]
export const EASE_IN = [0.4, 0, 1, 1]
export const EASE_IO = [0.65, 0, 0.35, 1]
export const EASE_SOFT = [0.4, 0, 0.2, 1]

// Duration palette (seconds): quick feedback, standard moves, slow reveals.
export const QUICK = 0.18
export const STD = 0.42
export const SLOW = 0.9

// Springs. Damping ratios sit around 0.85-0.95: a hint of overshoot reads
// as physical without looking playful.
export const SPRING = {
  orbit: { stiffness: 200, damping: 25, mass: 1 }, // the rings, ~2% overshoot
  focus: { type: 'spring', stiffness: 420, damping: 36 }, // focus bands, thumbs
  land: { type: 'spring', stiffness: 150, damping: 21, mass: 1 }, // the circle arriving, ~4% overshoot
  pop: { type: 'spring', stiffness: 380, damping: 28 }, // readouts, toasts
  press: { stiffness: 700, damping: 24 },
}

// Stagger budgets (seconds per step); totals stay under 0.5s.
export const CASCADE = 0.035
export const FAN = 0.07
