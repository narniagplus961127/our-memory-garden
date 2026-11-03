import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
import { destinationHref, isWebUrl, type Destination } from "./destinations";
import type { PageData } from "./pages";

type Node = DefaultTreeAdapterMap["node"];
const tags = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "small",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "br",
  "a",
]);
export const richFields: Record<string, Record<string, string>> = {
  Text: { text: "textRich" },
  Banner: { heading: "headingRich", description: "descriptionRich" },
  Image: { caption: "captionRich" },
  Button: { label: "labelRich" },
};
export const isRichLink = (value: string) =>
  isWebUrl(value) ||
  /^\/p\/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
export function validRichText(
  value: unknown,
  max = 100000,
  allowLinks = true,
): value is string {
  if (typeof value !== "string" || value.length > max * 6 + 1000) return false;
  let count = 0;
  function valid(node: Node, depth: number): boolean {
    if (++count > 20000 || depth > 24) return false;
    if (node.nodeName === "#text") return true;
    if (
      !("tagName" in node) ||
      !tags.has(node.tagName) ||
      node.namespaceURI !== "http://www.w3.org/1999/xhtml"
    )
      return false;
    if (node.tagName === "a" && !allowLinks) return false;
    if (
      !node.attrs.every(({ name, value }) => {
        if (
          name === "style" &&
          ["p", "h1", "h2", "h3", "h4"].includes(node.tagName)
        )
          return /^text-align:\s*(left|center);?$/.test(value);
        if (node.tagName !== "a") return false;
        if (name === "href") return isRichLink(value);
        if (name === "target") return ["_blank", "_self"].includes(value);
        if (name === "rel")
          return value
            .split(/\s+/)
            .every((word) =>
              ["noopener", "noreferrer", "nofollow"].includes(word),
            );
        return false;
      })
    )
      return false;
    return node.childNodes.every((child) => valid(child, depth + 1));
  }
  return (
    parseFragment(value).childNodes.every((node) => valid(node, 0)) &&
    richPlainText(value).length <= max
  );
}
export function richPlainText(html: string): string {
  function text(node: Node): string {
    if ("value" in node) return node.value;
    if (!("childNodes" in node)) return "";
    if ("tagName" in node && node.tagName === "br") return "\n";
    const content = node.childNodes.map(text).join("");
    return "tagName" in node &&
      ["p", "h1", "h2", "h3", "h4"].includes(node.tagName)
      ? content + "\n"
      : content;
  }
  return parseFragment(html).childNodes.map(text).join("").replace(/\n$/, "");
}
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
export function plainHtml(text: string, style = "p") {
  const safe = escapeHtml(text).replaceAll("\n", "<br>");
  return style === "small"
    ? "<p><small>" + safe + "</small></p>"
    : "<" + style + ">" + safe + "</" + style + ">";
}
// Legacy strings remain literal. Only explicit *Rich fields contain allowlisted HTML.
export function inlinePageData(data: PageData): PageData {
  function walk(blocks: PageData["content"]): PageData["content"] {
    return blocks.map((block) => {
      const props = { ...block.props };
      for (const [plain, rich] of Object.entries(
        richFields[block.type] ?? {},
      )) {
        if (props[rich] !== undefined) continue;
        const style =
          plain === "heading"
            ? "h1"
            : block.type === "Text"
              ? String(props.style ?? "p")
              : "p";
        props[rich] = plainHtml(String(props[plain] ?? ""), style);
        if (block.type === "Text" && props.linkText) {
          const text = String(props.text),
            link = String(props.linkText),
            index = text.indexOf(link),
            href = destinationHref(
              props.destination as Destination | undefined,
            );
          if (index >= 0 && href) {
            const tag = style === "small" ? "p" : style;
            props[rich] =
              "<" +
              tag +
              ">" +
              escapeHtml(text.slice(0, index)) +
              '<a href="' +
              escapeHtml(href) +
              '">' +
              escapeHtml(link) +
              "</a>" +
              escapeHtml(text.slice(index + link.length)) +
              "</" +
              tag +
              ">";
          }
        }
      }
      for (const slot of ["content", "left", "right", "third", "fourth"])
        if (Array.isArray(props[slot]))
          props[slot] = walk(props[slot] as PageData["content"]);
      return { ...block, props };
    });
  }
  return { root: { props: {} }, content: walk(data.content) };
}
export function richPageData(data: PageData): PageData {
  function walk(blocks: PageData["content"]): PageData["content"] {
    return blocks.map((block) => {
      const props = { ...block.props };
      for (const [plain, rich] of Object.entries(richFields[block.type] ?? {}))
        if (typeof props[rich] === "string")
          props[plain] = richPlainText(props[rich]);
      for (const slot of ["content", "left", "right", "third", "fourth"])
        if (Array.isArray(props[slot]))
          props[slot] = walk(props[slot] as PageData["content"]);
      return { ...block, props };
    });
  }
  return { root: { props: {} }, content: walk(data.content) };
}
export function editedPageData(data: PageData, previous: PageData): PageData {
  const existing = new Map<string, PageData["content"][number]>();
  function index(blocks: PageData["content"]) {
    for (const block of blocks) {
      existing.set(block.props.id, block);
      for (const slot of ["content", "left", "right", "third", "fourth"])
        if (Array.isArray(block.props[slot]))
          index(block.props[slot] as PageData["content"]);
    }
  }
  index(previous.content);
  function walk(blocks: PageData["content"]): PageData["content"] {
    return blocks.map((block) => {
      const props = { ...block.props },
        old = existing.get(props.id);
      if (old) {
        const prepared = inlinePageData({ root: { props: {} }, content: [old] })
          .content[0];
        for (const rich of Object.values(richFields[block.type] ?? {}))
          if (
            old.props[rich] === undefined &&
            props[rich] === prepared.props[rich]
          )
            delete props[rich];
      }
      if (block.type === "Text" && typeof props.textRich === "string") {
        delete props.linkText;
        delete props.destination;
      }
      for (const slot of ["content", "left", "right", "third", "fourth"])
        if (Array.isArray(props[slot]))
          props[slot] = walk(props[slot] as PageData["content"]);
      return { ...block, props };
    });
  }
  return { root: { props: {} }, content: walk(richPageData(data).content) };
}
export function richPageReferences(value: string): string[] {
  const ids: string[] = [];
  function walk(node: Node) {
    if ("tagName" in node && node.tagName === "a") {
      const href = node.attrs.find((a) => a.name === "href")?.value;
      if (href?.startsWith("/p/")) ids.push(href.slice(3));
    }
    if ("childNodes" in node) node.childNodes.forEach(walk);
  }
  parseFragment(value).childNodes.forEach(walk);
  return ids;
}
