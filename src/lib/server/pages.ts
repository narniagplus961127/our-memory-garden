import "server-only";
import { database } from "./db";
import type { GardenPage, PageData } from "../pages";
import { templateData, validPageData, type TemplateId } from "../blocks";
import { mergePage, snapshot, equal, type PageSnapshot } from "../page-merge";
import { RequestError } from "./http";
export type Administrator = { id: string; email: string; name: string };
const validId =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function listPages(
  _administrator: Administrator,
): Promise<GardenPage[]> {
  const rows = await database()<
    GardenPage[]
  >`select pages.*, exists(select 1 from garden_settings where homepage_id=pages.id) as is_homepage from pages where deleted_at is null order by updated_at desc`;
  return JSON.parse(JSON.stringify(rows));
}
export async function getVisiblePage(
  id: string,
  administrator: Administrator | null,
): Promise<GardenPage | null> {
  if (!validId.test(id)) return null;
  const rows = await database()<
    GardenPage[]
  >`select pages.*, exists(select 1 from garden_settings where homepage_id=pages.id) as is_homepage from pages where id=${id} and deleted_at is null and (${Boolean(administrator)} or visibility='public') limit 1`;
  return rows[0] ? JSON.parse(JSON.stringify(rows[0])) : null;
}
export async function createPrivatePage(
  administrator: Administrator,
  title: string,
  template: TemplateId = "blank",
): Promise<GardenPage> {
  const id = crypto.randomUUID();
  const rows = await database()<
    GardenPage[]
  >`insert into pages(id,title,slug,content,created_by,updated_by) values (${id},${title},${"page-" + id},${database().json(templateData(template))},${administrator.id},${administrator.id}) returning *`;
  return JSON.parse(JSON.stringify(rows[0]));
}
type SaveInput = Partial<PageSnapshot> & {
  version: number;
  text?: string;
  editorSessionId?: string;
  reason?: string;
};
type SavedRow = GardenPage & {
  edit_group_id: string;
  editor_session_id: string | null;
  edit_reason: string;
};
export async function savePage(
  administrator: Administrator,
  id: string,
  input: SaveInput,
) {
  if (!validId.test(id)) throw new RequestError(404, "Page not found.");
  return database().begin(async (sql) => {
    const [row] = await sql<
      SavedRow[]
    >`select pages.*, exists(select 1 from garden_settings where homepage_id=pages.id) as is_homepage from pages where id=${id} and deleted_at is null for update`;
    if (!row) throw new RequestError(404, "Page not found.");
    const current = JSON.parse(JSON.stringify(row)) as SavedRow;
    const baseRow =
      input.version === current.version
        ? current
        : (
            await sql<
              { snapshot: GardenPage }[]
            >`select snapshot from page_versions where page_id=${id} and version=${input.version}`
          )[0]?.snapshot;
    if (!baseRow)
      throw new RequestError(
        409,
        "The saved revision is unavailable. Your local work is retained; copy it before opening the latest page.",
      );
    const base = snapshot(baseRow),
      local = {
        ...base,
        ...(input.title === undefined ? {} : { title: input.title }),
        ...(input.visibility === undefined
          ? {}
          : { visibility: input.visibility }),
        ...(input.content === undefined ? {} : { content: input.content }),
      };
    if (input.text !== undefined)
      local.content = {
        root: { props: {} },
        content: [
          {
            type: "Text",
            props: {
              id:
                base.content.content.find((b) => b.type === "Text")?.props.id ??
                crypto.randomUUID(),
              text: input.text,
              style: "p",
            },
          },
        ],
      };
    const merged = mergePage(base, local, snapshot(current));
    if (merged.conflicts.length)
      return {
        kind: "conflict" as const,
        saved: current,
        base,
        local,
        ...merged,
      };
    if (!validPageData(merged.draft.content))
      throw new RequestError(400, "The merged block arrangement is invalid.");
    if (current.is_homepage && merged.draft.visibility === "private")
      throw new RequestError(
        409,
        "The homepage stays public. Choose another homepage first.",
      );
    if (equal(snapshot(current), merged.draft))
      return { kind: "saved" as const, page: current };
    const reuseGroup =
      input.reason !== "resolution" &&
      input.editorSessionId &&
      input.editorSessionId === current.editor_session_id &&
      administrator.id === current.updated_by &&
      Date.now() - new Date(current.updated_at).getTime() < 60000 &&
      merged.draft.visibility === current.visibility;
    const group = reuseGroup ? current.edit_group_id : crypto.randomUUID();
    const [updated] = await sql<
      GardenPage[]
    >`update pages set title=${merged.draft.title},content=${sql.json(merged.draft.content)},visibility=${merged.draft.visibility},version=version+1,updated_at=now(),updated_by=${administrator.id},edit_group_id=${group},editor_session_id=${input.editorSessionId ?? null},edit_reason=${input.reason === "resolution" ? "resolution" : "edit"} where id=${id} returning *, ${Boolean(current.is_homepage)} as is_homepage`;
    return {
      kind: "saved" as const,
      page: JSON.parse(JSON.stringify(updated)) as GardenPage,
    };
  });
}
