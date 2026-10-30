import "server-only";
import { database } from "./db";
import { RequestError } from "./http";
import { slotNames, slotContent, type PageBlock } from "../blocks";
import { validDestination } from "../destinations";
import type { PageData } from "../pages";
function referenceIds(data: PageData) {
  const ids = new Set<string>();
  function walk(blocks: PageBlock[]) {
    for (const block of blocks) {
      const destination = block.props.destination;
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
