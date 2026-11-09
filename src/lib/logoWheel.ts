/**
 * Shared state for the workflow's infinite logo wheel. While the cursor is
 * over the wheel, the page's wheel handler (useProjectWheel) turns the logos
 * instead of scrolling: it adds to `target` (unbounded in both directions)
 * and stamps `lastInput`. KineticChapters eases the wheel toward `target`
 * and snaps it to the nearest logo once the wheel goes quiet.
 */
export const logoWheel = {
  hovering: false,
  target: 0,
  lastInput: -Infinity,
};
