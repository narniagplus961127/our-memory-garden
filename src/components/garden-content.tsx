import type { Data } from "@puckeditor/core";
import type { GardenBlocks } from "./garden-blocks";
import { Render } from "@puckeditor/core/rsc";
import { gardenConfig } from "./garden-blocks";
import { richField } from "./garden-rich-field";
import type { PageData } from "@/lib/pages";
import { gridPages } from "@/lib/server/organization";
import { currentAdministrator } from "@/lib/server/auth";
import { slotNames, slotContent, type PageBlock } from "@/lib/blocks";
import type { GridSelection } from "@/lib/organization";
import { inlinePageData, renderPageDates } from "@/lib/rich-text";
import { gridPhotosUrl, photoGridRef } from "@/lib/photo-grid";
import { readGridBatch } from "@/lib/server/photo-grids";

const textBlock = gardenConfig.components.Text;
const renderConfig: typeof gardenConfig = {
  ...gardenConfig,
  components: {
    ...gardenConfig.components,
    Text: {
      ...textBlock,
      fields: textBlock.fields && {
        ...textBlock.fields,
        textRich: richField("Text content", "rendered"),
      },
    },
  },
};

export async function GardenContent({
  data,
  pageId,
  history,
  pageDate,
}: {
  data: PageData;
  pageId: string;
  history?: number;
  pageDate?: string | null;
}) {
  const administrator = await currentAdministrator();
  async function resolve(blocks: PageBlock[]): Promise<PageBlock[]> {
    return Promise.all(
      blocks.map(async (block) => {
        const props = { ...block.props };
        if (block.type === "Text" && typeof props.textRich === "string")
          props.textRich = renderPageDates(props.textRich, pageDate);
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
      config={renderConfig}
      data={
        {
          ...data,
          content: await resolve(inlinePageData(data).content),
        } as Data<GardenBlocks, { showTitle?: boolean }>
      }
    />
  );
}
