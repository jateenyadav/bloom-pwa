/**
 * The app's stacking order, in one place.
 *
 * The hard rule: the calm toolkit's trigger and overlay must always sit ABOVE
 * anything an experience can render. An experience that opens its own fullscreen
 * view (Memory Wall does) must use EXPERIENCE_OVERLAY, never a higher value —
 * otherwise it covers the calm button and breaks the one-tap guarantee.
 *
 * Tailwind arbitrary values (z-[40]) are compiled at build time, so these
 * constants are the source of truth and the classes must be kept in step; each
 * usage site references the constant it mirrors in a comment.
 */
export const LAYER = {
  /** Ambient background wash. */
  BACKDROP: -10,
  /** Fullscreen views opened from inside an experience. */
  EXPERIENCE_OVERLAY: 40,
  /** The floating calm button — above every experience. */
  CALM_TRIGGER: 50,
  /** The calm toolkit overlay itself — above everything. */
  CALM_OVERLAY: 60,
}

export default LAYER
