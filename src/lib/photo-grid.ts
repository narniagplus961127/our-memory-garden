import { slotContent, slotNames, type PageBlock } from "./blocks";
import type { PageData } from "./pages";

export const photoGridBatchSize = 24;
export const photoGridAddLimit = 100;
export type GridPickerPhoto = Pick<
  GridPhoto,
  "photoId" | "width" | "height"
> & {
  name: string;
};
export type PhotoGridRef = { gridId: string; gridRevision: number };
export type GridPhoto = {
  entryId: string;
  photoId: string;
  width: number;
  height: number;
  name?: string;
  alt: string;
  caption: string;
};
export type GridPhotoBatch = {
  photos: GridPhoto[];
  next: number | null;
  total: number;
};
export type PhotoGridChange =
  | { action: "add"; photos: { entryId: string; photoId: string }[] }
  | { action: "edit"; entryId: string; alt: string; caption: string }
  | { action: "move"; entryId: string; before: string | null }
  | { action: "remove"; entryId: string };

export function photoGridRef(
  block: PageBlock | undefined,
): PhotoGridRef | null {
  const props = block?.props;
  if (
    block?.type !== "PhotoGrid" ||
    typeof props?.gridId !== "string" ||
    typeof props.gridRevision !== "number"
  )
    return null;
  return { gridId: props.gridId, gridRevision: props.gridRevision };
}

export function findPhotoGrid(data: PageData, blockId: string) {
  function find(blocks: PageBlock[]): PageBlock | undefined {
    for (const block of blocks) {
      if (block.type === "PhotoGrid" && block.props.id === blockId)
        return block;
      for (const slot of slotNames(block.type, block.props.count)) {
        const nested = find(slotContent(block, slot));
        if (nested) return nested;
      }
    }
  }
  return find(data.content);
}

export function mapPhotoGrids(
  data: PageData,
  map: (block: PageBlock) => PageBlock,
): PageData {
  function visit(block: PageBlock): PageBlock {
    if (block.type === "PhotoGrid") return map(block);
    const slots = slotNames(block.type, block.props.count);
    if (!slots.length) return block;
    const props = { ...block.props };
    for (const slot of slots) {
      if (props[slot] !== undefined)
        props[slot] = slotContent(block, slot).map(visit);
    }
    return { ...block, props };
  }
  return { ...data, content: data.content.map(visit) };
}

export function gridPhotosUrl(
  pageId: string,
  blockId: string,
  ref: PhotoGridRef,
  history?: number,
) {
  const params = new URLSearchParams({
    grid: ref.gridId,
    revision: String(ref.gridRevision),
  });
  if (history !== undefined) params.set("history", String(history));
  return (
    "/api/pages/" +
    pageId +
    "/photo-grid/" +
    encodeURIComponent(blockId) +
    "?" +
    params
  );
}
