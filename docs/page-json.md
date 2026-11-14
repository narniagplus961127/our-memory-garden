# Edit a page with JSON

Open the page and choose **Page actions → Download page JSON**. Edit the file in a text editor. On the destination page, choose **Page actions → Import page JSON**, review the file, and confirm **Replace page content**. The destination keeps its URL and visibility. A public page shows the imported content immediately. Use **History** to restore the previous layout and details.

An export preserves the source page and version so the editor can detect an older copy. If the source page has changed, export it again and reapply your edits. To use a page layout on another existing page, import its file there. To create a new private page with the same content, use **Pages → Copy from page**.

## What to edit

Start with [this example](examples/page.json) or export a page that already has the layout you want. Keep the file’s format and version. Each block needs a unique ID within that file.

- Change a Text block’s `text` for plain text. Text blocks with formatting use `html`, which accepts the editor’s supported headings, paragraphs, links, and emphasis. To replace formatted text with plain text, remove `html` and add `text`.
- A Section has a `blocks` list. Columns have a `columns` list with one list of blocks per column. Reorder items in these lists to change their order.
- A Photo grid has a `photos` list. Each entry can include a caption and alternative text. The `photoId` refers to an existing Media Library photo. Reuse IDs from your own export when moving or copying photos. The file contains references to photos, and the garden backup can be used to export the original photo files.
- Keep private page exports somewhere private. Import accepts JSON files up to 2 MB. The URL shown in the export is informational when replacing a page.
