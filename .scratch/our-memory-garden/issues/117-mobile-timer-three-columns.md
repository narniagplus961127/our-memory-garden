# 117 — Three timer units per mobile row

Status: resolved

Update the compact mobile Live Count Up layout to three units per row, so the normal six-unit timer occupies two rows. Keep the wood style and readable English/Chinese labels at 320px, preserve larger layouts, and handle total-days and clock-off variants cleanly. Commit, push and deploy under the user's standing authorization.

## Answer

- Use three equal columns with a 6px gap in narrow timer containers. The six-unit calendar timer uses two rows; hiding the clock leaves one row.
- In total-days mode the day count spans the row above three clock tiles. The single day-count variant also spans the available width.
- Use proportional SVG slices in compact wooden tiles so their centre remains filled at 84px widths. Larger timer styling is unchanged.

## Verification

- Browser preview at 320, 390 and 1440px: English and Chinese labels, six/four/three/one-unit variants and a seven-digit total-day value fit without overflow. Six-unit mobile timers use two rows; three units use one row.
- Visually inspected the 320px timer and corrected the narrow SVG border rendering before release.
- Production build and focused formatting checks passed. No new behavior or database changes require service tests.
- Deploy through the working branch and PR to main, then verify the canonical website under standing authorization.
