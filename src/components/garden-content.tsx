import type { Data } from "@puckeditor/core";
import type { GardenBlocks } from "./garden-blocks";
import { Render } from "@puckeditor/core/rsc";
import { gardenConfig } from "./garden-blocks";
import type { PageData } from "@/lib/pages";
import { gridPages } from "@/lib/server/organization";
import { currentAdministrator } from "@/lib/server/auth";
import { slotNames, slotContent, type PageBlock } from "@/lib/blocks";
import type { GridSelection } from "@/lib/organization";
export async function GardenContent({ data }: { data: PageData }) {
  const administrator = await currentAdministrator();
  async function resolve(blocks: PageBlock[]): Promise<PageBlock[]> {
    return Promise.all(
      blocks.map(async (block) => {
        const props = { ...block.props };
        for (const slot of slotNames(block.type))
          props[slot] = await resolve(slotContent(block, slot));
        if (block.type === "PageGrid") {
          const selection = props.selection as GridSelection;
          const cards = await gridPages(selection, administrator);
          props.cards = cards;
          if (!administrator)
            props.selection = { ...selection, pageIds: cards.map((p) => p.id) };
        }
        return { ...block, props };
      }),
    );
  }
  return (
    <Render
      config={gardenConfig}
      data={
        { ...data, content: await resolve(data.content) } as Data<GardenBlocks>
      }
    />
  );
}
