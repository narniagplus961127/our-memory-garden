import type { Data } from "@puckeditor/core";
import type { GardenBlocks } from "./garden-blocks";
import { Render } from "@puckeditor/core/rsc";
import { gardenConfig } from "./garden-blocks";
import type { PageData } from "@/lib/pages";
import { gridPages } from "@/lib/server/organization";
import { currentAdministrator } from "@/lib/server/auth";
import { slotNames, slotContent, type PageBlock } from "@/lib/blocks";
import type { GridSelection } from "@/lib/organization";
import { inlinePageData } from "@/lib/rich-text";
import { gridPhotosUrl, photoGridRef } from "@/lib/photo-grid";
import { readGridBatch } from "@/lib/server/photo-grids";
export async function GardenContent({
  data,
  pageId,
  history,
}: {
  data: PageData;
  pageId: string;
  history?: number;
}) {
  const administrator = await currentAdministrator();
  async function resolve(blocks: PageBlock[]): Promise<PageBlock[]> {
    return Promise.all(
      blocks.map(async (block) => {
        const props = { ...block.props };
        for (const slot of slotNames(block.type, block.props.count))
          props[slot] = await resolve(slotContent(block, slot));
        if (block.type === "PageGrid") {
          const selection = props.selection as GridSelection;
          const cards = await gridPages(selection, administrator);
          props.cards = cards;
          if (!administrator)
            props.selection = { ...selection, pageIds: cards.map((p) => p.id) };
        }
        const photoGrid = photoGridRef(block);
        if (photoGrid) {
          props.initialPhotos = await readGridBatch(photoGrid, 0);
          props.photosUrl = gridPhotosUrl(
            pageId,
            block.props.id,
            photoGrid,
            history,
          );
        }
        return { ...block, props };
      }),
    );
  }
  return (
    <Render
      config={gardenConfig}
      data={
        {
          ...data,
          content: await resolve(inlinePageData(data).content),
        } as Data<GardenBlocks, { showTitle?: boolean }>
      }
    />
  );
}
