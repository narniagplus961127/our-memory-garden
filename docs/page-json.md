# Replace a page’s editor content

Open the page and choose **Page actions → Download page JSON**. Edit the file in a text editor. On the destination page, choose **Page actions → Import page content → Upload JSON**, review the file, and confirm **Replace page content**. The destination keeps its title, URL, visibility and other page settings. A public page shows the imported content immediately. Use **History** to restore the version that was saved before import.

You can import an older export or a file from another page. A file from an earlier version of the feature imports its blocks and ignores any page settings in the file.

To reuse an existing layout without downloading a file, choose **Import page content → Use another page**. Select the source, review the block and photo counts, and confirm **Replace page content**. The editor uses the source’s latest saved blocks when you confirm. The source page keeps its own blocks and Photo grid entries.

## What to edit

Start with [this example](examples/page.json) or export a page that already has the layout you want. Keep the file’s format and version. Each block needs a unique ID within that file.

- Change a Text block’s `text` for plain text. Text blocks with formatting use `html`, which accepts the editor’s supported headings, paragraphs, links, and emphasis. To replace formatted text with plain text, remove `html` and add `text`.
- A Section has a `blocks` list. Columns have a `columns` list with one list of blocks per column. Reorder items in these lists to change their order.
- A Photo grid has a `photos` list. Each entry can include a caption and alternative text. The `photoId` refers to an existing Media Library photo. Reuse IDs from your own export when moving or copying photos. The file contains references to photos, and the garden backup can be used to export the original photo files.
- Keep private page exports somewhere private. Import accepts JSON files up to 2 MB.
