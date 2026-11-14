import {
  blockNames,
  columnSlots,
  type PageBlock,
  validPageData,
} from "./blocks";
import { uuid } from "./organization";
import type { JsonValue, PageData } from "./pages";
import { richFields, richPageData, validRichText } from "./rich-text";

export const pageJsonFormat = "our-memory-garden/page";
export const maxPageJsonBytes = 2 * 1024 * 1024;
export type JsonGridPhoto = { photoId: string; alt: string; caption: string };
export type JsonGridPhotos = Map<string, JsonGridPhoto[]>;

type JsonBlock = {
  type: string;
  id: string;
  settings?: Record<string, JsonValue>;
  blocks?: JsonBlock[];
  columns?: JsonBlock[][];
  photos?: JsonGridPhoto[];
} & Record<string, unknown>;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkedString(value: unknown, max: number, label: string) {
  if (typeof value !== "string" || value.length > max || value.includes("\0"))
    throw Error(label + " must be text of at most " + max + " characters.");
  return value;
}

function optionalId(value: unknown, label: string) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !uuid.test(value))
    throw Error(label + " must be a garden ID.");
  return value.toLowerCase();
}

function htmlKey(plain: string) {
  return plain === "text" ? "html" : plain + "Html";
}

export function makePageJson(content: PageData, gridPhotos: JsonGridPhotos) {
  function serialize(block: PageBlock): JsonBlock {
    const {
      id,
      content,
      left,
      right,
      third,
      fourth,
      gridId: _gridId,
      gridRevision: _gridRevision,
      ...settings
    } = block.props;
    const result: JsonBlock = { type: block.type, id };
    const text: Record<string, string> = {};
    for (const [plain, rich] of Object.entries(richFields[block.type] ?? {})) {
      const formatted = settings[rich];
      const literal = settings[plain];
      if (typeof formatted === "string") text[htmlKey(plain)] = formatted;
      else if (typeof literal === "string") text[plain] = literal;
      delete settings[plain];
      delete settings[rich];
    }
    if (Object.keys(settings).length > 0) result.settings = settings;
    Object.assign(result, text);
    if (block.type === "Section")
      result.blocks = (content as PageBlock[]).map(serialize);
    if (block.type === "Columns") {
      const columns = [left, right, third, fourth];
      const count = Number(settings.count ?? 2);
      result.columns = columns
        .slice(0, count)
        .map((items) => ((items ?? []) as PageBlock[]).map(serialize));
    }
    if (block.type === "PhotoGrid") result.photos = gridPhotos.get(id) ?? [];
    return result;
  }
  return {
    format: pageJsonFormat,
    version: 1,
    page: { blocks: content.content.map(serialize) },
  };
}

export function parsePageJson(value: unknown) {
  if (!record(value) || value.format !== pageJsonFormat || value.version !== 1)
    throw Error(
      "Choose a supported Our Memory Garden page JSON file (version 1).",
    );
  const page = value.page;
  if (!record(page) || !Array.isArray(page.blocks))
    throw Error("The JSON file needs a page with a blocks array.");
  const gridPhotos: JsonGridPhotos = new Map();
  let count = 0;
  function parseBlocks(blocks: unknown, depth: number): PageBlock[] {
    if (!Array.isArray(blocks) || depth > 12)
      throw Error("The block layout is invalid.");
    return blocks.map((entry) => {
      if (
        ++count > 300 ||
        !record(entry) ||
        typeof entry.type !== "string" ||
        !blockNames.some((type) => type === entry.type) ||
        typeof entry.id !== "string" ||
        (entry.settings !== undefined && !record(entry.settings))
      )
        throw Error(
          "Each block needs a supported type, a unique ID and valid settings.",
        );
      const { id, type, settings = {} } = entry;
      const fields = Object.hasOwn(richFields, type) ? richFields[type] : {};
      const structure =
        type === "Section"
          ? ["blocks"]
          : type === "Columns"
            ? ["columns"]
            : type === "PhotoGrid"
              ? ["photos"]
              : [];
      const rawSettings = settings as Record<string, JsonValue>;
      if (
        Object.keys(rawSettings).some((key) =>
          [
            "id",
            "content",
            ...columnSlots,
            "gridId",
            "gridRevision",
            ...Object.keys(fields),
            ...Object.values(fields),
          ].includes(key),
        ) ||
        Object.keys(entry).some(
          (key) =>
            ![
              "type",
              "id",
              "settings",
              ...structure,
              ...Object.keys(fields),
              ...Object.keys(fields).map(htmlKey),
            ].includes(key),
        )
      )
        throw Error("Unexpected fields in block " + id + ".");
      const props = { ...rawSettings, id } as PageBlock["props"];
      const limits: Record<string, number> = {
        text: 100000,
        heading: 1000,
        description: 10000,
        caption: 2000,
        label: 200,
      };
      for (const [plain, rich] of Object.entries(fields)) {
        const formatted = entry[htmlKey(plain)];
        const literal = entry[plain];
        if (formatted !== undefined && literal !== undefined)
          throw Error(
            "Use either plain text or formatted HTML for " +
              plain +
              " in block " +
              id +
              ".",
          );
        if (formatted !== undefined) {
          if (!validRichText(formatted, limits[plain], type !== "Button"))
            throw Error("Invalid formatted HTML in block " + id + ".");
          props[plain] = "";
          props[rich] = formatted;
        } else if (literal !== undefined) {
          props[plain] = checkedString(
            literal,
            limits[plain],
            plain + " in block " + id,
          );
        }
      }
      if (type === "Text" && props.style === undefined) {
        const html = typeof props.textRich === "string" ? props.textRich : "";
        props.style = /^\s*<(h[1-4])\b/i.exec(html)?.[1].toLowerCase() ?? "p";
      }
      if (type === "Section")
        props.content = parseBlocks(entry.blocks, depth + 1);
      if (type === "Columns") {
        const cols = entry.columns;
        if (
          !Array.isArray(cols) ||
          cols.length < 1 ||
          cols.length > 4 ||
          (props.count !== undefined && props.count !== cols.length)
        )
          throw Error("Use one to four columns in block " + id + ".");
        props.count = cols.length;
        columnSlots.forEach((slot, index) => {
          if (index < cols.length || index < 2)
            props[slot] = parseBlocks(cols[index] ?? [], depth + 1);
        });
      }
      if (type === "PhotoGrid") {
        const photos = entry.photos === undefined ? [] : entry.photos;
        if (!Array.isArray(photos))
          throw Error("Use a photos array in block " + id + ".");
        gridPhotos.set(
          id,
          photos.map((item) => {
            if (!record(item))
              throw Error("Use a photo object in block " + id + ".");
            const photoId = optionalId(item.photoId, "Photo ID");
            if (!photoId)
              throw Error("Each photo needs a photo ID in block " + id + ".");
            return {
              photoId,
              alt: checkedString(item.alt ?? "", 1000, "Alternative text"),
              caption: checkedString(item.caption ?? "", 2000, "Photo caption"),
            };
          }),
        );
      }
      return { type, props };
    });
  }
  const raw: PageData = {
    root: { props: {} },
    content: parseBlocks(page.blocks, 0),
  };
  const content = richPageData(raw);
  if (!validPageData(content))
    throw Error("Check the block types, IDs and settings in the JSON file.");
  return { content, gridPhotos, count };
}
