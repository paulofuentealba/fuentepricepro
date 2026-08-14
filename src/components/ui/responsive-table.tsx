/**
 * Shared styling contract for the "sticky first column" pattern used by
 * dense, horizontally-scrollable tables on mobile (Regra 5 — mobile-first).
 * The first column (usually the row's identifying value, e.g. ticker) stays
 * pinned while the rest of the row scrolls under it — the reader never
 * loses track of which row they're looking at.
 *
 * Requires an ancestor with `overflow-x-auto` and a table `min-w-[...]`
 * wider than the viewport (the existing horizontal-scroll pattern already
 * used across the app — this only adds the missing sticky column on top of
 * it, it does not replace it).
 *
 * The background is set explicitly (not inherited) so content scrolling
 * underneath never bleeds through a translucent/glassmorphism surface —
 * see fuente-ux-designer, Regra 6. Pass a different `bg-*` token via
 * `className` if the table's surface isn't `bg-card`.
 */
export const STICKY_FIRST_COLUMN_CLASS = "sticky left-0 z-10 bg-card";
