# Replace a page’s editor content

Choose **Page actions → Import page content → Upload JSON**, review an existing file, and confirm **Replace page content**. The destination keeps its title, URL, visibility and other page settings. A public page shows the imported content immediately. Use **History** to restore the version that was saved before import. Page JSON downloads and garden exports have been removed.

You can import an older export or a file from another page. A file from an earlier version of the feature imports its blocks and ignores any page settings in the file.

To reuse an existing layout without downloading a file, choose **Import page content → Use another page**. Select the source, review the block and photo counts, and confirm **Replace page content**. The editor uses the source’s latest saved blocks when you confirm. The source page keeps its own blocks and Photo grid entries.

For a saved template, choose **Import page content → Use template content**. Select a template, review its blocks, and confirm replacement. Photos become placeholders and the new blocks stay independent of the template. The destination's page settings stay unchanged. Switching import tabs clears the previous selection/review, and a deleted template cannot replace content. You can also open **View history** directly from a page's three-dot menu in the Pages list.

## What to edit

Start with [this example](examples/page.json) or an existing JSON file. Keep the file’s format and version. Each block needs a unique ID within that file.

- Change a Text block’s `text` for plain text. Text blocks with formatting use `html`, which accepts the editor’s supported headings, paragraphs, links, and emphasis. To replace formatted text with plain text, remove `html` and add `text`.
- A Section has a `blocks` list. Columns have a `columns` list with one list of blocks per column. Reorder items in these lists to change their order.
- A Photo grid has a `photos` list. Each entry can include a caption and alternative text. The `photoId` refers to an existing Media Library photo. JSON contains photo references, not photo files. To reuse a current page's photos and layout, use **Use another page**.
- Keep JSON files containing private page content somewhere private. Import accepts JSON files up to 2 MB. Individual original photos can still be downloaded from their Media Library details.
