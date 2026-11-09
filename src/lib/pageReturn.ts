/**
 * Where the visitor was in the portfolio when they opened the résumé page, so
 * coming back lands them in the same view (Work project or About scroll).
 * Module state: it survives client-side page changes, not reloads.
 */
export const pageReturn = {
  pending: false,
  view: "work" as "work" | "about",
  index: 0,
  scroll: 0,
};

/** Fired by in-page buttons (e.g. the Contact footer) to open the résumé. */
export const RESUME_EVENT = "portfolio:resume";
