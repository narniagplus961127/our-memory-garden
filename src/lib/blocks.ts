import type { PageData, JsonValue } from "./pages";
export const blockNames = [
  "Text",
  "Banner",
  "Image",
  "Button",
  "Section",
  "Columns",
] as const;
export type BlockName = (typeof blockNames)[number];
export type PageBlock = PageData["content"][number];
export function slotNames(type: string): string[] {
  return type === "Section"
    ? ["content"]
    : type === "Columns"
      ? ["left", "right"]
      : [];
}
export function slotContent(block: PageBlock, name: string): PageBlock[] {
  return block.props[name] as PageBlock[];
}
export function isWebUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}
export function validPageData(value: unknown): value is PageData {
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
    Object.keys(root.props).length
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
          Text: ["text", "style", "align"],
          Banner: ["heading", "description", "background", "align"],
          Image: ["alt", "caption", "fit", "width"],
          Button: ["label", "href", "variant", "align"],
          Section: ["background", "spacing", "content"],
          Columns: ["ratio", "gap", "left", "right"],
        };
        if (
          Object.keys(props).some(
            (key) => key !== "id" && !allowed[type as BlockName].includes(key),
          )
        )
          return false;
        const str = (key: string, max: number, required = false) =>
          props[key] === undefined
            ? !required
            : typeof props[key] === "string" && props[key].length <= max;
        const opt = (key: string, values: string[], required = false) =>
          props[key] === undefined ? !required : values.includes(props[key]);
        if (!opt("align", ["left", "center"])) return false;
        switch (type) {
          case "Text":
            return (
              str("text", 100000, true) &&
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
              str("alt", 1000, true) &&
              str("caption", 2000) &&
              opt("fit", ["cover", "contain"]) &&
              opt("width", ["inset", "full"])
            );
          case "Button":
            return (
              str("label", 200, true) &&
              typeof props.href === "string" &&
              props.href.length <= 2000 &&
              isWebUrl(props.href) &&
              opt("variant", ["primary", "secondary"])
            );
          case "Section":
            return (
              opt("background", ["paper", "sage", "clay"]) &&
              opt("spacing", ["compact", "comfortable", "spacious"]) &&
              list(props.content, depth + 1)
            );
          case "Columns":
            return (
              opt("ratio", ["equal", "wide-left", "wide-right"]) &&
              opt("gap", ["compact", "comfortable", "spacious"]) &&
              list(props.left, depth + 1) &&
              list(props.right, depth + 1)
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
    description: "A gentle banner, photograph and written moment.",
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
  const banner = () =>
    block("Banner", {
      heading: "The moments we grow together",
      description: "Little stories, gathered with love.",
      background: "sage",
      align: "left",
    });
  if (template === "story")
    return {
      root: { props: {} },
      content: [
        banner(),
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
        banner(),
        image(),
        text("A day to remember", "h2"),
        text("Write about the things you noticed today."),
      ],
    };
  return { root: { props: {} }, content: [text("")] };
}
