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
  /**
   * The menu button and its drawer.
   *
   * Above experience overlays so the menu is always openable, but deliberately
   * BELOW the calm trigger: with the menu open, the calm button must still be
   * sitting on top of it, one tap away. The menu is a convenience; calm is a
   * guarantee.
   */
  MENU: 45,
  /** The floating calm button — above every experience and the menu. */
  CALM_TRIGGER: 50,
  /** The calm toolkit overlay itself — above everything. */
  CALM_OVERLAY: 60,
}

export default LAYER
