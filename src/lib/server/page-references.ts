import "server-only";
import { database } from "./db";
import { RequestError } from "./http";
import { slotNames, slotContent, type PageBlock } from "../blocks";
import { validDestination } from "../destinations";
import type { PageData } from "../pages";
import type { GridSelection } from "../organization";
function referenceIds(data: PageData) {
  const ids = new Set<string>();
  function walk(blocks: PageBlock[]) {
    for (const block of blocks) {
      const destination = block.props.destination;
      if (block.type === "PageGrid") {
        const selection = block.props.selection as {
          mode?: string;
          pageIds?: string[];
        };
        if (selection.mode === "manual")
          for (const id of selection.pageIds ?? []) ids.add(id);
      }
      if (validDestination(destination) && destination.kind === "page")
        ids.add(destination.pageId);
      for (const slot of slotNames(block.type)) walk(slotContent(block, slot));
    }
  }
  walk(data.content);
  return ids;
}
export async function validatePageReferences(
  content: PageData,
  previous: PageData,
) {
  const categoryIds = new Set<string>();
  function categories(blocks: PageBlock[]) {
    for (const block of blocks) {
      if (block.type === "PageGrid") {
        const selection = block.props.selection as GridSelection;
        if (selection.mode === "category" && selection.categoryId)
          categoryIds.add(selection.categoryId);
      }
      for (const slot of slotNames(block.type))
        categories(slotContent(block, slot));
    }
  }
  categories(content.content);
  if (categoryIds.size) {
    const found =
      await database()`select id from page_categories where id in ${database()([...categoryIds])}`;
    if (found.length !== categoryIds.size)
      throw new RequestError(
        400,
        "Choose an existing category for the page grid.",
      );
  }
  const existing = referenceIds(previous);
  const ids = [...referenceIds(content)].filter((id) => !existing.has(id));
  if (!ids.length) return;
  const available = await database()<
    { id: string }[]
  >`select id from pages where id in ${database()(ids)} and deleted_at is null`;
  if (available.length !== ids.length)
    throw new RequestError(
      400,
      "Choose an available garden page for the link.",
    );
}
