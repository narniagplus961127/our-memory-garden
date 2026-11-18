# 74 — Responsive photo sizes

Status: resolved

- Generate 320, 640 and 1,280 px wide WebP copies when a photo upload is completed. Preserve the aspect ratio and reuse the current display copy for widths it already fits. Apply the same access check to every size and recheck access before returning a conditional response.
- Use smaller files in the media library, photo pickers, photo grids, page cards, and editor previews. The photo viewer uses the display copy. Downloads and backups use the protected original.
- Backfill existing display copies with a resumable job outside Vercel. Photos without thumbnails fall back to their display copy.

## Backfill

Run `node --env-file=.env.neon.local scripts/backfill-photo-thumbnails.mjs` for a dry run with the count and estimated source bytes. Add `--apply --limit=25` to process a batch. Repeat until the remaining count is zero. An interrupted or failed batch can be run again. No photo files pass through Vercel during the backfill.

## Verification

Upload, conditional-request privacy, and expired staging cleanup passed against an isolated database and S3-compatible storage. Desktop and mobile checks covered the Photo Grid, its editor controls and viewer, Image block links, and sharing previews. The thumbnail rollout still uses the app's visibility checks on each request.
