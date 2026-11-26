import { parseFragment, type DefaultTreeAdapterMap } from "parse5";
import { slotContent, slotNames, type PageBlock } from "./blocks";
import { richFields } from "./rich-text";
import { photoDescription } from "./photo-description";

type ContentSuggestion = { blockId: string; message: string };
type Node = DefaultTreeAdapterMap["node"];

export function contentSuggestions(blocks: PageBlock[], hasPageTitle: boolean) {
  const suggestions: ContentSuggestion[] = [];
  let previousLevel = hasPageTitle ? 1 : 0;
  let titleCount = hasPageTitle ? 1 : 0;
  function heading(level: number, blockId: string) {
    if (level === 1 && ++titleCount > 1)
      suggestions.push({
        blockId,
        message: "Another H1 is already present. Use H2 for a section heading.",
      });
    else if (level > previousLevel + 1)
      suggestions.push({
        blockId,
        message: `H${level} skips H${previousLevel + 1}. Choose H${previousLevel + 1}, or use Body for a subtitle and adjust its font size.`,
      });
    previousLevel = level;
  }
  function inspectHtml(html: string, blockId: string) {
    function visit(node: Node) {
      if ("tagName" in node && /^h[1-4]$/.test(node.tagName))
        heading(Number(node.tagName[1]), blockId);
      if ("childNodes" in node) node.childNodes.forEach(visit);
    }
    parseFragment(html).childNodes.forEach(visit);
  }
  function visit(block: PageBlock) {
    const { props } = block;
    const fields = richFields[block.type] ?? {};
    for (const rich of Object.values(fields)) {
      if (typeof props[rich] === "string") inspectHtml(props[rich], props.id);
    }
    if (block.type === "Text" && props.textRich === undefined) {
      if (typeof props.style === "string" && /^h[1-4]$/.test(props.style))
        heading(Number(props.style[1]), props.id);
    }
    if (block.type === "Banner" && props.headingRich === undefined)
      heading(1, props.id);
    if (
      block.type === "LiveCountUp" &&
      typeof props.heading === "string" &&
      props.heading.trim()
    )
      heading(2, props.id);
    if (
      block.type === "Image" &&
      props.photoId &&
      !photoDescription(String(props.alt ?? ""), String(props.caption ?? ""))
    )
      suggestions.push({
        blockId: props.id,
        message:
          "Add a short image description of what is visible in the photo.",
      });
    for (const slot of slotNames(block.type, props.count))
      slotContent(block, slot).forEach(visit);
  }
  blocks.forEach(visit);
  return suggestions;
}
