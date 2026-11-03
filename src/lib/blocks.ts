import { isWebUrl, validDestination } from "./destinations";
import { validGrid } from "./organization";
import { richFields, validRichText } from "./rich-text";
export { isWebUrl } from "./destinations";
import type { PageData, JsonValue } from "./pages";
export const blockNames = [
  "Text",
  "Banner",
  "Image",
  "PageGrid",
  "Gallery",
  "Button",
  "Section",
  "Columns",
] as const;
export type BlockName = (typeof blockNames)[number];
export type PageBlock = PageData["content"][number];
export const columnSlots = ["left", "right", "third", "fourth"] as const;
export function slotNames(type: string, count: unknown = 2): string[] {
  return type === "Section"
    ? ["content"]
    : type === "Columns"
      ? columnSlots.slice(0, typeof count === "number" ? count : 2)
      : [];
}
export function slotContent(block: PageBlock, name: string): PageBlock[] {
  return (block.props[name] ?? []) as PageBlock[];
}
export function validPageData(
  value: unknown,
  options: { allowIncomplete?: boolean } = {},
): value is PageData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  if (
    Object.keys(data).some((key) => !["root", "content", "zones"].includes(key))
  )
    return false;
  if (!data.root || typeof data.root !== "object" || Array.isArray(data.root))
    return false;
  const root = data.root as Record<string, unknown>;
  if (
    Object.keys(root).some((key) => key !== "props") ||
    !root.props ||
    typeof root.props !== "object" ||
    Array.isArray(root.props) ||
    Object.entries(root.props).some(
      ([key, value]) => key !== "showTitle" || typeof value !== "boolean",
    )
  )
    return false;
  if (
    data.zones !== undefined &&
    (!data.zones ||
      typeof data.zones !== "object" ||
      Array.isArray(data.zones) ||
      Object.keys(data.zones).length)
  )
    return false;
  function destination(value: unknown) {
    if (validDestination(value)) return true;
    if (
      !options.allowIncomplete ||
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    )
      return false;
    const d = value as Record<string, unknown>;
    return (
      Object.keys(d).length === 2 &&
      ((d.kind === "page" && typeof d.pageId === "string") ||
        (d.kind === "external" && typeof d.url === "string"))
    );
  }

  const ids = new Set<string>();
  let count = 0;
  function list(value: unknown, depth: number): boolean {
    return (
      depth <= 12 &&
      Array.isArray(value) &&
      value.every((item) => {
        if (
          ++count > 300 ||
          !item ||
          typeof item !== "object" ||
          Array.isArray(item)
        )
          return false;
        if (Object.keys(item).some((key) => !["type", "props"].includes(key)))
          return false;
        const { type, props } = item;
        if (
          !blockNames.includes(type) ||
          !props ||
          typeof props !== "object" ||
          Array.isArray(props)
        )
          return false;
        if (
          typeof props.id !== "string" ||
          !/^[\w-]{1,120}$/.test(props.id) ||
          props.id === "root" ||
          ids.has(props.id)
        )
          return false;
        ids.add(props.id);
        const allowed: Record<BlockName, string[]> = {
          Text: ["text", "style", "align", "linkText", "destination"],
          Banner: ["heading", "description", "background", "align"],
          Image: ["photoId", "alt", "caption", "fit", "width", "destination"],
          PageGrid: ["selection", "showDate"],
          Gallery: ["photos"],
          Button: [
            "label",
            "href",
            "destination",
            "variant",
            "align",
            "width",
            "buttonColor",
            "textColor",
          ],
          Section: [
            "background",
            "spacing",
            "content",
            "backgroundImage",
            "contentBackground",
            "borderWidth",
            "borderColor",
            "columnAlignment",
          ],
          Columns: [
            "ratio",
            "gap",
            "left",
            "right",
            "third",
            "fourth",
            "count",
          ],
        };
        if (
          Object.keys(props).some(
            (key) =>
              key !== "id" &&
              ![
                ...allowed[type as BlockName],
                ...Object.values(richFields[type] ?? {}),
                "backgroundColor",
                "padding",
                "paddingSides",
                "marginSides",
                "radius",
              ].includes(key),
          )
        )
          return false;
        if (
          props.backgroundColor !== undefined &&
          (typeof props.backgroundColor !== "string" ||
            (props.backgroundColor !== "" &&
              !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(props.backgroundColor)))
        )
          return false;
        for (const key of ["padding", "radius"])
          if (
            props[key] !== undefined &&
            (!Number.isInteger(props[key]) ||
              props[key] < 0 ||
              props[key] > (key === "padding" ? 120 : 24))
          )
            return false;
        for (const key of ["paddingSides", "marginSides"]) {
          const sides = props[key];
          if (
            sides !== undefined &&
            (!sides ||
              typeof sides !== "object" ||
              Array.isArray(sides) ||
              Object.entries(sides).some(
                ([side, n]) =>
                  !["top", "right", "bottom", "left"].includes(side) ||
                  typeof n !== "number" ||
                  !Number.isInteger(n) ||
                  n < 0 ||
                  n > 120,
              ))
          )
            return false;
        }
        const richLimits: Record<string, number> = {
          text: 100000,
          heading: 1000,
          description: 10000,
          caption: 2000,
          label: 200,
        };
        for (const [plain, rich] of Object.entries(richFields[type] ?? {}))
          if (
            props[rich] !== undefined &&
            !validRichText(
              props[rich],
              options.allowIncomplete ? 100000 : richLimits[plain],
              type !== "Button",
            )
          )
            return false;
        const str = (key: string, max: number, required = false) =>
          props[key] === undefined
            ? !required
            : typeof props[key] === "string" &&
              (options.allowIncomplete || props[key].length <= max);
        const opt = (key: string, values: string[], required = false) =>
          props[key] === undefined ? !required : values.includes(props[key]);
        if (!opt("align", ["left", "center", "right"])) return false;
        switch (type) {
          case "PageGrid":
            return (
              validGrid(props.selection) &&
              (props.showDate === undefined ||
                typeof props.showDate === "boolean")
            );
          case "Text":
            return (
              str("text", 100000, true) &&
              str("linkText", 1000) &&
              (props.destination == null || destination(props.destination)) &&
              opt("style", ["h1", "h2", "h3", "h4", "p", "small"], true)
            );
          case "Banner":
            return (
              str("heading", 1000, true) &&
              str("description", 10000, true) &&
              opt("background", ["paper", "sage", "clay"])
            );
          case "Image":
            return (
              (props.destination == null || destination(props.destination)) &&
              (props.photoId === undefined ||
                props.photoId === "" ||
                (typeof props.photoId === "string" &&
                  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
                    props.photoId,
                  ))) &&
              str("alt", 1000, true) &&
              str("caption", 2000) &&
              opt("fit", ["cover", "contain"]) &&
              opt("width", ["inset", "full"])
            );
          case "Gallery":
            return (
              Array.isArray(props.photos) &&
              props.photos.length <= 100 &&
              props.photos.every((photo: unknown) => {
                if (!photo || typeof photo !== "object" || Array.isArray(photo))
                  return false;
                const item = photo as Record<string, unknown>;
                return (
                  Object.keys(item).every((key) =>
                    ["photoId", "caption"].includes(key),
                  ) &&
                  typeof item.photoId === "string" &&
                  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
                    item.photoId,
                  ) &&
                  (item.caption === undefined ||
                    (typeof item.caption === "string" &&
                      item.caption.length <= 2000))
                );
              })
            );
          case "Button":
            return (
              opt("width", ["fit", "full"]) &&
              ["buttonColor", "textColor"].every(
                (key) =>
                  props[key] === undefined ||
                  props[key] === "" ||
                  (typeof props[key] === "string" &&
                    /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(props[key])),
              ) &&
              str("label", 200, true) &&
              (props.destination
                ? destination(props.destination)
                : options.allowIncomplete
                  ? typeof props.href === "string"
                  : isWebUrl(props.href)) &&
              opt("variant", ["primary", "secondary"])
            );
          case "Section":
            return (
              (props.backgroundImage === undefined ||
                (props.backgroundImage &&
                  typeof props.backgroundImage === "object" &&
                  !Array.isArray(props.backgroundImage) &&
                  Object.keys(props.backgroundImage).length === 1 &&
                  typeof props.backgroundImage.photoId === "string" &&
                  (props.backgroundImage.photoId === "" ||
                    /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
                      props.backgroundImage.photoId,
                    )))) &&
              (props.contentBackground === undefined ||
                (props.contentBackground &&
                  typeof props.contentBackground === "object" &&
                  !Array.isArray(props.contentBackground) &&
                  Object.keys(props.contentBackground).every((key) =>
                    ["mode", "colour"].includes(key),
                  ) &&
                  ["auto", "custom", "none"].includes(
                    props.contentBackground.mode,
                  ) &&
                  (props.contentBackground.colour === undefined ||
                    props.contentBackground.colour === "" ||
                    (typeof props.contentBackground.colour === "string" &&
                      /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(
                        props.contentBackground.colour,
                      ))))) &&
              (props.borderWidth === undefined ||
                (Number.isInteger(props.borderWidth) &&
                  props.borderWidth >= 0 &&
                  props.borderWidth <= 12)) &&
              (props.borderColor === undefined ||
                props.borderColor === "" ||
                (typeof props.borderColor === "string" &&
                  /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(props.borderColor))) &&
              opt("columnAlignment", ["top", "center", "bottom"]) &&
              opt("background", ["paper", "sage", "clay"]) &&
              opt("spacing", ["compact", "comfortable", "spacious"]) &&
              list(props.content, depth + 1)
            );
          case "Columns":
            return (
              (props.count === undefined ||
                [1, 2, 3, 4].includes(props.count)) &&
              opt("ratio", [
                "equal",
                "wide-left",
                "wide-right",
                "quarter-left",
                "quarter-right",
              ]) &&
              opt("gap", ["compact", "comfortable", "spacious"]) &&
              columnSlots.every((name, index) => {
                const children = props[name] ?? (index > 1 ? [] : undefined);
                return (
                  list(children, depth + 1) &&
                  (index < (props.count ?? 2) || children.length === 0)
                );
              })
            );
          default:
            return false;
        }
      })
    );
  }
  return list(data.content, 0);
}
export const templates = [
  { id: "blank", label: "Blank page", description: "A quiet space to begin." },
  {
    id: "story",
    label: "Our story",
    description: "A welcome, two columns and room for memories.",
  },
  {
    id: "journal",
    label: "Garden journal",
    description: "A welcome, photograph and written moment.",
  },
] as const;
export type TemplateId = (typeof templates)[number]["id"];
export function templateData(template: TemplateId = "blank"): PageData {
  const block = (
    type: BlockName,
    props: Record<string, JsonValue>,
  ): PageBlock => ({ type, props: { id: crypto.randomUUID(), ...props } });
  const text = (text: string, style = "p") =>
    block("Text", { text, style, align: "left" });
  const image = () =>
    block("Image", {
      alt: "A photograph from our garden",
      caption: "",
      fit: "cover",
      width: "inset",
    });
  const welcome = () =>
    block("Section", {
      background: "sage",
      spacing: "spacious",
      content: [
        text("The moments we grow together", "h1"),
        text("Little stories, gathered with love."),
      ],
    });
  if (template === "story")
    return {
      root: { props: {} },
      content: [
        welcome(),
        block("Section", {
          background: "paper",
          spacing: "comfortable",
          content: [
            block("Columns", {
              ratio: "equal",
              gap: "comfortable",
              left: [
                text("Our story", "h2"),
                text("It began with a little moment worth remembering."),
              ],
              right: [image()],
            }),
          ],
        }),
      ],
    };
  if (template === "journal")
    return {
      root: { props: {} },
      content: [
        welcome(),
        block("Section", {
          background: "paper",
          spacing: "comfortable",
          content: [
            image(),
            text("A day to remember", "h2"),
            text("Write about the things you noticed today."),
          ],
        }),
      ],
    };
  return { root: { props: {} }, content: [] };
}
