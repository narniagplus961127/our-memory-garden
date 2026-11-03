import { Extension, Mark } from "@tiptap/core";
import type { RichtextField } from "@puckeditor/core";
import { InlineFormatMenu } from "./inline-format-menu";

const Small = Mark.create({
  name: "gardenSmall",
  parseHTML: () => [{ tag: "small" }],
  renderHTML: () => ["small", 0],
});
export function richField(label: string): RichtextField {
  const allowLinks = label !== "Button label";
  return {
    type: "richtext",
    label,
    contentEditable: true,
    visible: false,
    options: {
      heading: { levels: [1, 2, 3, 4] },
      blockquote: false,
      code: false,
      codeBlock: false,
      horizontalRule: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
      strike: false,
      textAlign: {
        types: ["heading", "paragraph"],
        alignments: ["left", "center"],
      },
      link: allowLinks
        ? {
            openOnClick: false,
            autolink: false,
            linkOnPaste: false,
            HTMLAttributes: { target: null, rel: null },
          }
        : false,
    },
    tiptap: {
      extensions: [
        Small,
        Extension.create({
          name: "gardenFieldLabel",
          onCreate() {
            this.editor.view.dom.setAttribute("aria-label", label);
          },
        }),
      ],
    },
    renderMenu: () => null,
    renderInlineMenu: ({ editor }) => (
      <InlineFormatMenu editor={editor} allowLinks={allowLinks} />
    ),
  };
}
