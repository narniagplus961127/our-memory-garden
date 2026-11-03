import type { GardenPage, PageData } from "./pages";
import { slotNames, slotContent, columnSlots, type PageBlock } from "./blocks";
import { inlinePageData, richPageData } from "./rich-text";
export type PageSnapshot = Pick<GardenPage, "title" | "content" | "visibility">;
export type PageConflict = {
  key: string;
  kind: "block" | "metadata" | "layout";
  blockId?: string;
  label: string;
  local: unknown;
  saved: unknown;
};
export type MergeResult = { draft: PageSnapshot; conflicts: PageConflict[] };
export function snapshot(page: PageSnapshot): PageSnapshot {
  return {
    title: page.title,
    content: { root: { props: {} }, content: page.content.content },
    visibility: page.visibility,
  };
}
export function equal(a: unknown, b: unknown): boolean {
  // JSON object property order is not meaningful.
  return stable(a) === stable(b);
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => JSON.stringify(k) + ":" + stable(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "undefined";
}
type Tree = {
  nodes: Map<string, PageBlock>;
  lists: Map<string, string[]>;
  originals: Map<string, PageBlock>;
  parents: Map<string, string>;
};
function flatten(data: PageData): Tree {
  const nodes = new Map<string, PageBlock>(),
    lists = new Map<string, string[]>(),
    originals = new Map<string, PageBlock>(),
    parents = new Map<string, string>();
  function walk(blocks: PageBlock[], zone: string) {
    lists.set(
      zone,
      blocks.map((b) => b.props.id),
    );
    for (const block of blocks) {
      originals.set(block.props.id, block);
      parents.set(block.props.id, zone);
      const props = { ...block.props };
      if (block.type === "Columns")
        for (const slot of columnSlots) delete props[slot];
      for (const slot of slotNames(block.type, block.props.count)) {
        delete props[slot];
        walk(slotContent(block, slot), block.props.id + ":" + slot);
      }
      nodes.set(block.props.id, { type: block.type, props });
    }
  }
  walk(data.content, "root");
  return { nodes, lists, originals, parents };
}
export function mergePage(
  base: PageSnapshot,
  local: PageSnapshot,
  saved: PageSnapshot,
  choices: Record<string, "local" | "saved"> = {},
): MergeResult {
  const conflicts: PageConflict[] = [];
  function choose<T>(
    key: string,
    kind: PageConflict["kind"],
    label: string,
    b: T,
    l: T,
    s: T,
    blockId?: string,
  ): T {
    const equivalent = (a: T, other: T) => {
      if (kind !== "block" || !a || !other) return equal(a, other);
      const canonical = (value: T) => {
        const block = richPageData(
          inlinePageData({
            root: { props: {} },
            content: [value as PageBlock],
          }),
        ).content[0];
        if (block.type === "Text") {
          delete block.props.linkText;
          delete block.props.destination;
          delete block.props.style;
        }
        return block;
      };
      return equal(canonical(a), canonical(other));
    };
    if (equivalent(l, b)) return s;
    if (equivalent(s, b) || equivalent(l, s)) return l;
    if (!choices[key])
      conflicts.push({ key, kind, label, blockId, local: l, saved: s });
    return choices[key] === "saved" ? s : l;
  }
  const trees = [
    flatten(base.content),
    flatten(local.content),
    flatten(saved.content),
  ];
  const [b, l, s] = trees,
    nodes = new Map<string, PageBlock>(),
    lists = new Map<string, string[]>();
  for (const id of new Set(trees.flatMap((t) => [...t.nodes.keys()]))) {
    const bn = b.nodes.get(id),
      ln = l.nodes.get(id),
      sn = s.nodes.get(id);
    const node =
      ln && sn
        ? choose("block:" + id, "block", ln.type + " block", bn, ln, sn, id)
        : (ln ?? sn);
    if (node) nodes.set(id, node);
  }
  for (const zone of new Set(trees.flatMap((t) => [...t.lists.keys()]))) {
    lists.set(
      zone,
      choose(
        "layout:" + zone,
        "layout",
        "Block arrangement",
        b.lists.get(zone),
        l.lists.get(zone),
        s.lists.get(zone),
      ) ?? [],
    );
  }

  // Deleting a changed subtree or its destination requires an explicit layout choice.
  const affectedIds = new Set<string>();
  function includeSubtree(id: string) {
    for (const tree of trees) {
      const visited = new Set<string>();
      function walk(nodeId: string) {
        const node = tree.nodes.get(nodeId);
        if (!node || visited.has(nodeId)) return;
        visited.add(nodeId);
        affectedIds.add(nodeId);
        for (const slot of slotNames(node.type, node.props.count))
          for (const child of tree.lists.get(nodeId + ":" + slot) ?? [])
            walk(child);
      }
      walk(id);
    }
  }

  for (const [id, original] of b.originals) {
    for (const [deleted, changed] of [
      [l, s],
      [s, l],
    ]) {
      if (
        !deleted.nodes.has(id) &&
        changed.nodes.has(id) &&
        (!equal(original, changed.originals.get(id)) ||
          changed.parents.get(id) !== b.parents.get(id) ||
          !equal(
            changed.lists.get(b.parents.get(id)!),
            b.lists.get(b.parents.get(id)!),
          ))
      )
        includeSubtree(id);
    }
  }
  function useLayout(scope?: Set<string>) {
    const key = scope ? "layout:contested" : "layout:all";
    if (!choices[key] && !conflicts.some((c) => c.key === key))
      conflicts.push({
        key,
        kind: "layout",
        label: scope
          ? "Contested move or deletion"
          : "Overlapping page layouts",
        local: local.content,
        saved: saved.content,
      });
    const source = choices[key] === "saved" ? s : l;
    const zones =
      scope ?? new Set(trees.flatMap((tree) => [...tree.lists.keys()]));
    // Column topology belongs to the layout choice, together with every cell.
    // Restoring a third/fourth cell with a locally reduced count would hide its children.
    for (const [id, node] of nodes) {
      if (node.type !== "Columns") continue;
      const localCount = l.nodes.get(id)?.props.count ?? 2,
        savedCount = s.nodes.get(id)?.props.count ?? 2;
      if (
        localCount === savedCount ||
        !columnSlots.some((slot) => zones.has(id + ":" + slot))
      )
        continue;
      for (const slot of columnSlots) zones.add(id + ":" + slot);
      const chosen = source.nodes.get(id);
      if (chosen)
        nodes.set(id, {
          ...node,
          props: {
            ...node.props,
            count: chosen.props.count ?? 2,
            ratio: chosen.props.ratio ?? "equal",
          },
        });
    }
    for (const zone of zones) lists.set(zone, source.lists.get(zone) ?? []);
    for (let i = conflicts.length - 1; i >= 0; i--) {
      const c = conflicts[i];
      if (
        c.kind === "layout" &&
        c.key !== key &&
        (!scope || scope.has(c.key.slice("layout:".length)))
      )
        conflicts.splice(i, 1);
    }
  }
  const contestedZones = new Set(
    conflicts
      .filter((c) => c.kind === "layout")
      .map((c) => c.key.slice("layout:".length)),
  );
  for (const id of affectedIds)
    for (const tree of trees) {
      const parent = tree.parents.get(id);
      if (parent) contestedZones.add(parent);
      const node = tree.nodes.get(id);
      if (node)
        for (const slot of slotNames(node.type, node.props.count))
          contestedZones.add(id + ":" + slot);
    }
  if (contestedZones.size) useLayout(contestedZones);
  function build(zone: string, seen = new Set<string>()): PageBlock[] {
    return (lists.get(zone) ?? []).map((id) => {
      if (seen.has(id) || !nodes.has(id))
        throw new Error("Overlapping arrangements");
      seen.add(id);
      const node = nodes.get(id)!,
        props = { ...node.props };
      for (const slot of slotNames(node.type, node.props.count))
        props[slot] = build(id + ":" + slot, seen);
      if (node.type === "Columns" && node.props.count !== undefined)
        for (const slot of columnSlots)
          if (!slotNames(node.type, node.props.count).includes(slot))
            props[slot] = [];
      return { type: node.type, props };
    });
  }
  let content: PageBlock[];
  try {
    content = build("root");
  } catch {
    useLayout();
    content = build("root");
  }
  return {
    draft: {
      title: choose(
        "title",
        "metadata",
        "Page title",
        base.title,
        local.title,
        saved.title,
      ),
      visibility: choose(
        "visibility",
        "metadata",
        "Page visibility",
        base.visibility,
        local.visibility,
        saved.visibility,
      ),
      content: { root: { props: {} }, content },
    },
    conflicts,
  };
}
