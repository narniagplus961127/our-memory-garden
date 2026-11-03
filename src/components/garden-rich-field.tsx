import { Extension, Mark } from "@tiptap/core";
import type { RichtextField } from "@puckeditor/core";
import { InlineEditorBridge } from "./inline-editing";
import {
  textColour,
  textPixels,
  textFont,
  textLineHeight,
} from "@/lib/text-appearance";

const TextAppearance = Mark.create({
  name: "gardenTextStyle",
  addAttributes() {
    return Object.fromEntries(
      (
        [
          ["color", "color", (v: string) => textColour(v)],
          ["fontSize", "font-size", (v: string) => textPixels(v, 8, 120)],
          ["fontFamily", "font-family", textFont],
          [
            "letterSpacing",
            "letter-spacing",
            (v: string) => textPixels(v, -2, 20),
          ],
        ] as const
      ).map(([key, property, safe]) => {
        return [
          key,
          {
            default: null,
            parseHTML: (element: HTMLElement) =>
              safe(element.style.getPropertyValue(property)),
            renderHTML: (attributes: Record<string, string>) => {
              const value = safe(attributes[key] ?? "");
              return value ? { style: property + ": " + value } : {};
            },
          },
        ];
      }),
    );
  },
  parseHTML: () => [{ tag: "span[style]" }],
  renderHTML: ({ HTMLAttributes }) => ["span", HTMLAttributes, 0],
});
const ParagraphAppearance = Extension.create({
  name: "gardenParagraphStyle",
  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              textLineHeight(element.style.lineHeight),
            renderHTML: (attributes: Record<string, string>) => {
              const value = textLineHeight(attributes.lineHeight ?? "");
              return value ? { style: "line-height: " + value } : {};
            },
          },
        },
      },
    ];
  },
});

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
        TextAppearance,
        ParagraphAppearance,
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
      <InlineEditorBridge editor={editor} allowLinks={allowLinks} />
    ),
  };
}
