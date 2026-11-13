# 56 — Add a Photo grid widget

Status: ready-for-human

## Design review

Open the Photo grid editor and website flows in `Our Memory Garden.figcraft` on branch `prototype/photo-grid`. Desktop and mobile flows show the grid, batch photo selection, the result after adding photos, the website's Load more action, and the photo viewer. The first photo opens the example viewer. The picker shows three example selections. The screens use sample photos and represent saved states.

## Acceptance criteria

- Photo grid is an addable widget inside a Section or its columns. The existing Image block serves individual photos. Existing Gallery blocks continue to render and edit using their saved settings.
- Use the shared Media Library to add multiple photos at once, including newly uploaded photos. Selected thumbnails have a clear selected state and the dialog shows the count before confirming. The inspector lets administrators reorder with a drag handle and a keyboard or touch alternative, edit alt text and optional captions, and remove entries from the grid. Removing an entry leaves the photo in the Media Library. Edits autosave with feedback and retry through the editor.
- Lay out photos using their stored dimensions, preserving portrait and landscape proportions. Use up to four columns on desktop and two on phones, with one when the available container is narrow. Offer maximum columns, gap and corner radius settings. The website and editor canvas use the same layout logic. Keep the grid in its Section's width, including full-width sections.
- Show the first 24 photos on the website and add another batch on request without reshuffling earlier photos. Serve optimized display images. Opening a photo shows it in a keyboard-accessible viewer with a close control, previous and next navigation, and focus return.
- Support adding to the collection repeatedly without the legacy Gallery's fixed 100-photo limit. Store ordered entries separately from page block JSON and page content autosave requests. Page content points to a stable grid ID. Load bounded batches in the editor and on the website. Availability remains subject to storage capacity.
- Carry grid references through page visibility, authenticated editing, current photo usage, trash, history and restore, exports and template copies. Templates retain the grid layout with placeholders. Duplicating a grid or a page must produce an independent photo list. Keep private photos inaccessible to anonymous visitors and guard concurrent edits.

## Verification

Check adding, reordering, editing, viewing and removing photos on desktop and mobile. Use a mixed-orientation collection beyond 100 photos to verify pagination and an edit on the same page. Verify keyboard order, protected photos, restore and independent copies.
