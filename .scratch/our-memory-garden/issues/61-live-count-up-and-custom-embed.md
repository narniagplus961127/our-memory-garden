# 61 — Live Count Up and Custom Embed blocks

Status: resolved

Add both blocks to the Puck palette for sections and columns.

- **Live Count Up** starts from an editable date and optional time in Malaysia. The default is 2 May 2022 at midnight. It offers calendar totals or total days, Chinese or English units, an optional ticking clock and date caption, and configurable appearance. Changed digits roll by default. Reduced-motion preferences skip the roll.
- **Custom Embed** accepts self-contained HTML, CSS and JavaScript and lets the user set a title and frame height. The editor runs the script when the user chooses Run preview. The published page loads the iframe on approach. The iframe runs with an opaque origin, inline scripts and styles, and embedded assets. Network requests and external assets are outside the current embed configuration. The source limit is 32,000 characters.
- Both blocks use the existing content validation, autosave, template and page JSON paths. The feature uses the existing page storage schema.

## Verification

The focused browser journey covers creating and editing the blocks, autosave, JSON export and replacement, public ticking with reduced motion, responsive widths, embed interactions and frame isolation. Calendar checks cover Malaysia wall-clock time and short-month anniversaries.
