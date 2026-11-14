import "server-only";
import type postgres from "postgres";
import { database } from "./db";
import { RequestError } from "./http";
import { slotNames, slotContent, type PageBlock } from "../blocks";
import { validDestination } from "../destinations";
import type { PageData } from "../pages";
import type { GridSelection } from "../organization";
import {
  richFields,
  richPageReferences,
  richCategoryReferences,
} from "../rich-text";
function referenceIds(data: PageData) {
  const ids = new Set<string>();
  function walk(blocks: PageBlock[]) {
    for (const block of blocks) {
      for (const key of Object.values(richFields[block.type] ?? {}))
        if (typeof block.props[key] === "string")
          for (const id of richPageReferences(block.props[key])) ids.add(id);
      const destination = block.props.destination;
      if (block.type === "PageGrid") {
        const selection = block.props.selection as {
          mode?: string;
          pageIds?: string[];
        };
        if (selection.mode === "manual")
          for (const id of selection.pageIds ?? []) ids.add(id);
      }
      if (
        !(block.type === "Text" && typeof block.props.textRich === "string") &&
        validDestination(destination) &&
        destination.kind === "page"
      )
        ids.add(destination.pageId);
      for (const slot of slotNames(block.type, block.props.count))
        walk(slotContent(block, slot));
    }
  }
  walk(data.content);
  return ids;
}
export async function validatePageReferences(
  content: PageData,
  previous: PageData,
  transaction?: postgres.TransactionSql,
) {
  const sql = transaction ?? database();
  function categoryReferences(data: PageData) {
    const categoryIds = new Set<string>();
    function categories(blocks: PageBlock[]) {
      for (const block of blocks) {
        for (const key of Object.values(richFields[block.type] ?? {}))
          if (typeof block.props[key] === "string")
            for (const id of richCategoryReferences(block.props[key]))
              categoryIds.add(id);
        const destination = block.props.destination;
        if (validDestination(destination) && destination.kind === "category")
          categoryIds.add(destination.categoryId);
        if (block.type === "PageGrid") {
          const selection = block.props.selection as GridSelection;
          if (selection.mode === "category" && selection.categoryId)
            categoryIds.add(selection.categoryId);
        }
        for (const slot of slotNames(block.type, block.props.count))
          categories(slotContent(block, slot));
      }
    }
    categories(data.content);
    return categoryIds;
  }
  const priorCategories = categoryReferences(previous);
  const categoryIds = [...categoryReferences(content)].filter(
    (id) => !priorCategories.has(id),
  );
  if (categoryIds.length) {
    const found =
      await sql`select id from page_categories where id in ${sql(categoryIds)}`;
    if (found.length !== categoryIds.length)
      throw new RequestError(
        400,
        "Choose an existing category for the link or page grid.",
      );
  }
  const existing = referenceIds(previous);
  const ids = [...referenceIds(content)].filter((id) => !existing.has(id));
  if (!ids.length) return;
  const available = await sql<
    { id: string }[]
  >`select id from pages where id in ${sql(ids)} and deleted_at is null`;
  if (available.length !== ids.length)
    throw new RequestError(
      400,
      "Choose an available garden page for the link.",
    );
}
