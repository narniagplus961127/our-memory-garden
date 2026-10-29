import type { Data } from "@puckeditor/core";
import type { GardenBlocks } from "./garden-blocks";
import { Render } from "@puckeditor/core/rsc";
import { gardenConfig } from "./garden-blocks";
import type { PageData } from "@/lib/pages";
export function GardenContent({ data }: { data: PageData }) {
  return <Render config={gardenConfig} data={data as Data<GardenBlocks>} />;
}
