import { columnSlots, slotContent, slotNames, type PageBlock } from "./blocks";
import type { PageData } from "./pages";

export type PageTemplate = {
  id: string;
  name: string;
  content: PageData;
  version: number;
};
export type TemplateSummary = Pick<PageTemplate, "id" | "name" | "version">;

// These IDs are seeded by 0017-editable-starter-templates.sql. The aliases
// keep the original page-creation API inputs working for these starters.
export const starterTemplates = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    alias: "story",
    description: "A welcome, two columns and room for memories.",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    alias: "journal",
    description: "A welcome, photograph and written moment.",
  },
] as const;

export function copyTemplateForPage(data: PageData): PageData {
  function copy(block: PageBlock): PageBlock {
    const props: PageBlock["props"] = {
      ...block.props,
      id: crypto.randomUUID(),
    };
    for (const slot of slotNames(block.type, block.props.count)) {
      props[slot] = slotContent(block, slot).map(copy);
    }
    return { ...block, props };
  }
  return { root: data.root, content: data.content.map(copy) };
}

export function templatePlaceholders(data: PageData): PageData {
  function copy(block: PageBlock): PageBlock {
    const props = { ...block.props };
    switch (block.type) {
      case "Image":
        delete props.photoId;
        break;
      case "Gallery":
        delete props.photos;
        return { type: "Image", props: { ...props, alt: "" } };
      case "Section":
        delete props.backgroundImage;
        props.content = slotContent(block, "content").map(copy);
        break;
      case "Columns":
        for (const slot of columnSlots) {
          props[slot] = slotContent(block, slot).map(copy);
        }
        break;
    }
    return { type: block.type, props };
  }
  return { root: data.root, content: data.content.map(copy) };
}
