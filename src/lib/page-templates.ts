import { columnSlots, slotContent, type PageBlock } from "./blocks";
import type { PageData } from "./pages";

export type PageTemplate = {
  id: string;
  name: string;
  content: PageData;
  version: number;
};

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
          if (Array.isArray(props[slot]))
            props[slot] = slotContent(block, slot).map(copy);
        }
        break;
    }
    return { type: block.type, props };
  }
  return { root: data.root, content: data.content.map(copy) };
}
