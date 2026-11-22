import type { GardenPage } from "./pages";

export type PageChoice = Pick<
  GardenPage,
  "id" | "title" | "slug" | "visibility"
>;
export type PageChoices = { pages: PageChoice[]; nextCursor: string | null };
export const pageChoiceBatchSize = 30;
