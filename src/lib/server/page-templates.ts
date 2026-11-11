import "server-only";
import { templateData, validPageData } from "../blocks";
import { uuid } from "../organization";
import { equal } from "../page-merge";
import {
  templatePlaceholders,
  type PageTemplate,
  type TemplateSummary,
} from "../page-templates";
import { database } from "./db";
import { RequestError } from "./http";
import { getVisiblePage, type Administrator } from "./pages";

function templateName(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 200)
    throw new RequestError(
      400,
      "Enter a template name between 1 and 200 characters.",
    );
  return value.trim();
}

export async function listPageTemplates() {
  return database()<TemplateSummary[]>`
    select id, name, version from page_templates order by lower(name), id
  `;
}

export async function deletePageTemplate(id: string, version: unknown) {
  if (!uuid.test(id)) throw new RequestError(404, "Template not found.");
  if (!Number.isSafeInteger(version) || Number(version) < 1)
    throw new RequestError(
      400,
      "Review the saved template before deleting it.",
    );
  const [deleted] = await database()<{ id: string }[]>`
    delete from page_templates where id = ${id} and version = ${Number(version)} returning id
  `;
  if (!deleted && (await getPageTemplate(id)))
    throw new RequestError(
      409,
      "This template changed. Reload the list to review it before deleting.",
    );
}

export async function getPageTemplate(id: string) {
  if (!uuid.test(id)) return null;
  const [template] = await database()<PageTemplate[]>`
    select id, name, content, version from page_templates where id = ${id}
  `;
  return template ?? null;
}

export async function createPageTemplate(
  admin: Administrator,
  input: Record<string, unknown>,
) {
  const id = input.id ?? crypto.randomUUID();
  if (typeof id !== "string" || !uuid.test(id))
    throw new RequestError(400, "Invalid template request.");
  const name = templateName(input.name);
  // A retry after a lost response must not create another copy.
  const existing = await getPageTemplate(id);
  if (existing) return existing;
  let content = templateData();
  if (input.pageId !== undefined) {
    if (
      typeof input.pageId !== "string" ||
      !Number.isSafeInteger(input.pageVersion)
    )
      throw new RequestError(400, "Choose a saved page to copy.");
    const page = await getVisiblePage(input.pageId, admin);
    if (!page) throw new RequestError(404, "Page not found.");
    if (page.version !== input.pageVersion)
      throw new RequestError(
        409,
        "This page changed since you opened it. Reload the editor before copying it.",
      );
    content = templatePlaceholders(page.content);
  }
  const sql = database();
  const [template] = await sql<PageTemplate[]>`
    insert into page_templates (id, name, content)
    values (${id}, ${name}, ${sql.json(content)}) on conflict (id) do nothing
    returning id, name, content, version
  `;
  return template ?? (await getPageTemplate(id));
}

export async function savePageTemplate(
  id: string,
  input: Record<string, unknown>,
) {
  if (!uuid.test(id)) throw new RequestError(404, "Template not found.");
  const name = templateName(input.name);
  if (!Number.isSafeInteger(input.version) || !validPageData(input.content))
    throw new RequestError(
      400,
      "Check the template content and try saving again.",
    );
  const content = templatePlaceholders(input.content);
  const sql = database();
  const [saved] = await sql<PageTemplate[]>`
    update page_templates set name = ${name}, content = ${sql.json(content)},
      version = version + 1, updated_at = now()
    where id = ${id} and version = ${Number(input.version)}
    returning id, name, content, version
  `;
  if (saved) return saved;
  const latest = await getPageTemplate(id);
  if (!latest) throw new RequestError(404, "Template not found.");
  if (name === latest.name && equal(content, latest.content)) return latest;
  throw new RequestError(
    409,
    "This template changed in another tab. Open the saved template separately to review it before discarding your edits.",
  );
}
