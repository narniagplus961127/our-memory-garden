"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Puck,
  Drawer,
  createUsePuck,
  useGetPuck,
  type Data,
} from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import { gardenConfig } from "./garden-blocks";
import {
  blockNames,
  slotNames,
  slotContent,
  isWebUrl,
  type BlockName,
  type PageBlock,
} from "@/lib/blocks";
import type { GardenPage, PageData } from "@/lib/pages";
import { usePageAutosave } from "./use-page-autosave";
import { SaveFeedback } from "./save-feedback";
import { equal } from "@/lib/page-merge";
const useGardenPuck = createUsePuck<typeof gardenConfig>();
type Snapshot = import("@/lib/page-merge").PageSnapshot;
function documentData(data: Data): PageData {
  return { root: { props: {} }, content: data.content as PageBlock[] };
}
function EditorSync({ content }: { content: PageData }) {
  const getPuck = useGetPuck();
  const selected = useGardenPuck((state) => state.selectedItem);
  useEffect(() => {
    const api = getPuck();
    if (equal(documentData(api.appState.data), content)) return;
    const id = selected?.props.id;
    api.dispatch({ type: "setData", data: content });
    const selector = id ? getPuck().getSelectorForId(id) : undefined;
    api.dispatch({ type: "setUi", ui: { itemSelector: selector ?? null } });
  }, [content, getPuck, selected]);
  return null;
}
type Target = { zone: string; label: string; items: PageBlock[] };
type OutlineItem = { block: PageBlock; label: string; depth: number };
function documentOutline(content: PageBlock[]) {
  const targets: Target[] = [
      { zone: "root:default-zone", label: "Page", items: content },
    ],
    items: OutlineItem[] = [],
    counts: Record<string, number> = {};
  function walk(blocks: PageBlock[], depth: number) {
    for (const block of blocks) {
      const label =
        block.type + " " + (counts[block.type] = (counts[block.type] ?? 0) + 1);
      items.push({ block, label, depth });
      for (const slot of slotNames(block.type)) {
        const children = slotContent(block, slot);
        targets.push({
          zone: block.props.id + ":" + slot,
          label:
            label + " · " + (slot === "content" ? "content" : slot + " column"),
          items: children,
        });
        walk(children, depth + 1);
      }
    }
  }
  walk(content, 0);
  return { targets, items };
}
function Workspace({
  page,
  title,
  visibility,
  status,
  error,
  retry,
  feedback,
  onMetadata,
}: {
  page: GardenPage;
  title: string;
  visibility: GardenPage["visibility"];
  status: string;
  error: string;
  retry: () => void;
  feedback: React.ReactNode;
  onMetadata: (changes: Partial<Snapshot>) => void;
}) {
  const [panel, setPanel] = useState<"content" | "settings" | null>("content"),
    [device, setDevice] = useState<"desktop" | "mobile">("desktop"),
    [explicitTarget, setExplicitTarget] = useState<string | null>(null);
  useEffect(() => {
    if (window.matchMedia("(max-width:760px)").matches) setDevice("mobile");
  }, []);
  const data = useGardenPuck((state) => state.appState.data),
    selected = useGardenPuck((state) => state.selectedItem),
    getPuck = useGetPuck();
  const { targets, items } = documentOutline(data.content as PageBlock[]);
  const selection = selected
    ? getPuck().getSelectorForId(selected.props.id)
    : undefined;
  const preferredZone =
    selected && slotNames(selected.type)[0]
      ? selected.props.id + ":" + slotNames(selected.type)[0]
      : selection?.zone;
  const target =
    targets.find((item) => item.zone === (explicitTarget ?? preferredZone)) ??
    targets[0];
  const siblings =
    targets.find((item) => item.zone === selection?.zone)?.items ?? [];
  function select(id: string) {
    const api = getPuck(),
      selector = api.getSelectorForId(id);
    if (selector) {
      api.dispatch({ type: "setUi", ui: { itemSelector: selector } });
      setExplicitTarget(null);
    }
  }
  function insert(type: BlockName) {
    const api = getPuck();
    const current = selected
      ? api.getSelectorForId(selected.props.id)
      : undefined;
    const index =
      !explicitTarget && current?.zone === target.zone
        ? current.index + 1
        : target.items.length;
    const id = crypto.randomUUID();
    api.dispatch({
      type: "insert",
      componentType: type,
      destinationIndex: index,
      destinationZone: target.zone,
      id,
    });
    api.dispatch({
      type: "setUi",
      ui: { itemSelector: { index, zone: target.zone } },
    });
    setExplicitTarget(null);
  }
  function action(kind: "up" | "down" | "duplicate" | "remove") {
    if (!selected) return;
    const api = getPuck(),
      current = api.getSelectorForId(selected.props.id);
    if (!current) return;
    if (kind === "up" || kind === "down") {
      const destination = current.index + (kind === "up" ? -1 : 1);
      if (destination < 0 || destination >= siblings.length) return;
      api.dispatch({
        type: "reorder",
        sourceIndex: current.index,
        destinationIndex: destination,
        destinationZone: current.zone,
      });
      api.dispatch({
        type: "setUi",
        ui: { itemSelector: { index: destination, zone: current.zone } },
      });
    } else if (kind === "duplicate")
      api.dispatch({
        type: "duplicate",
        sourceIndex: current.index,
        sourceZone: current.zone,
      });
    else {
      const parent = api.getParentById(selected.props.id);
      const parentSelector =
        parent && parent.props.id !== "root"
          ? api.getSelectorForId(parent.props.id)
          : undefined;
      api.dispatch({
        type: "remove",
        index: current.index,
        zone: current.zone,
      });
      api.dispatch({
        type: "setUi",
        ui: { itemSelector: parentSelector ?? null },
      });
      setExplicitTarget(null);
    }
  }
  return (
    <div className={"garden-editor panel-" + (panel ?? "closed")}>
      <header className="garden-workspace-bar">
        <Link href="/admin/pages" className="editor-back">
          ← Pages
        </Link>
        <div className="editor-page-identity">
          <label className="visually-hidden" htmlFor="page-title">
            Page title
          </label>
          <input
            id="page-title"
            value={title}
            maxLength={200}
            onChange={(event) => {
              onMetadata({ title: event.target.value });
            }}
          />
        </div>
        <label className="visually-hidden" htmlFor="page-visibility">
          Page visibility
        </label>
        <select
          id="page-visibility"
          aria-label="Page visibility"
          value={visibility}
          disabled={page.is_homepage}
          onChange={(event) => {
            const next = event.target.value === "public" ? "public" : "private";
            onMetadata({ visibility: next });
          }}
        >
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
        <span
          role="status"
          aria-label="Auto-save status"
          className="editor-save-status"
        >
          {status}
        </span>
      </header>
      <div className="garden-editor-tools">
        <div className="actions">
          <button
            className={panel === "content" ? "active" : "secondary"}
            aria-label="Open content panel"
            aria-expanded={panel === "content"}
            onClick={() => setPanel("content")}
          >
            ＋ Content
          </button>
          <button
            className={panel === "settings" ? "active" : "secondary"}
            aria-label="Open settings panel"
            aria-expanded={panel === "settings"}
            onClick={() => setPanel("settings")}
          >
            Settings
          </button>
        </div>
        <div className="actions device-controls" aria-label="Canvas width">
          <button
            aria-pressed={device === "desktop"}
            onClick={() => setDevice("desktop")}
          >
            Desktop
          </button>
          <button
            aria-pressed={device === "mobile"}
            onClick={() => setDevice("mobile")}
          >
            Mobile
          </button>
        </div>
      </div>
      {error && (
        <div role="alert" className="editor-save-error">
          <span>{error} Your edits remain in this editor.</span>
          <button onClick={retry}>Retry save</button>
        </div>
      )}
      {feedback}
      <div className="garden-editor-body">
        <aside
          className="garden-editor-panel"
          aria-label={panel === "settings" ? "Block settings" : "Page content"}
          hidden={!panel}
        >
          <div className="panel-heading">
            <h2>
              {panel === "settings"
                ? selected
                  ? selected.type + " settings"
                  : "Page settings"
                : "Make it yours"}
            </h2>
            <button
              className="secondary"
              aria-label="Close panel"
              onClick={() => setPanel(null)}
            >
              Close
            </button>
          </div>
          {panel === "content" ? (
            <>
              <p className="muted">
                <small>
                  Drag a block onto the page, or choose a place and tap Add.
                </small>
              </p>
              <label htmlFor="add-target">Add to</label>
              <select
                id="add-target"
                value={target.zone}
                onChange={(event) => setExplicitTarget(event.target.value)}
              >
                {targets.map((item) => (
                  <option key={item.zone} value={item.zone}>
                    {item.label}
                  </option>
                ))}
              </select>
              <div className="garden-palette">
                <Drawer>
                  {blockNames.map((type) => (
                    <div className="garden-palette-row" key={type}>
                      <Drawer.Item name={type}>
                        {() => (
                          <span className="garden-drag-tile">
                            {type} <span aria-hidden="true">⠿</span>
                          </span>
                        )}
                      </Drawer.Item>
                      <button
                        className="secondary"
                        aria-label={"Add " + type}
                        onClick={() => insert(type)}
                      >
                        ＋ Add
                      </button>
                    </div>
                  ))}
                </Drawer>
              </div>
              <h3>On this page</h3>
              <div className="garden-block-list">
                {items.map((item) => (
                  <button
                    key={item.block.props.id}
                    className="secondary"
                    style={{ paddingLeft: 12 + item.depth * 16 }}
                    aria-label={"Select " + item.label}
                    aria-pressed={selected?.props.id === item.block.props.id}
                    onClick={() => select(item.block.props.id)}
                  >
                    {item.label}
                    <span>
                      {item.block.type === "Text"
                        ? String(item.block.props.text).slice(0, 28)
                        : ""}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {selected ? (
                <>
                  <p className="muted">
                    <small>
                      Changes appear on the canvas and save automatically.
                    </small>
                  </p>
                  <div className="block-move-controls">
                    <button
                      className="secondary"
                      aria-label="Move block up"
                      disabled={!selection || selection.index === 0}
                      onClick={() => action("up")}
                    >
                      ↑ Move up
                    </button>
                    <button
                      className="secondary"
                      aria-label="Move block down"
                      disabled={
                        !selection || selection.index >= siblings.length - 1
                      }
                      onClick={() => action("down")}
                    >
                      ↓ Move down
                    </button>
                    <button
                      className="secondary"
                      aria-label="Duplicate block"
                      onClick={() => action("duplicate")}
                    >
                      Duplicate
                    </button>
                    <button
                      className="secondary"
                      aria-label="Remove block"
                      onClick={() => action("remove")}
                    >
                      Remove
                    </button>
                  </div>
                  <Puck.Fields />
                  {selected.type === "Button" &&
                    !isWebUrl(String(selected.props.href)) && (
                      <p role="alert" className="error">
                        Enter a complete http:// or https:// web address.
                      </p>
                    )}

                  {selected.type === "Image" && (
                    <p className="muted">
                      <small>
                        Photo placeholder. Library and uploads arrive with the
                        media library.
                      </small>
                    </p>
                  )}
                  {selected.type === "Button" && (
                    <p className="muted">
                      <small>
                        Use a complete https:// or http:// address. Garden page
                        links arrive with navigation.
                      </small>
                    </p>
                  )}
                </>
              ) : (
                <p className="muted">
                  Select a block on the canvas or in Content to change its
                  settings.
                </p>
              )}
            </>
          )}
        </aside>
        <section
          className="garden-canvas-workspace"
          aria-label="Live page canvas"
        >
          <div className="canvas-size-label">
            {device === "desktop" ? "Desktop · 1280 px" : "Mobile · 390 px"} ·
            Live canvas{page.is_homepage ? " · Homepage" : ""}
          </div>
          <div className="garden-canvas-scroll">
            <div
              className={"garden-canvas-frame canvas-" + device}
              data-device={device}
            >
              <Puck.Preview />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
export function PageEditor({
  page,
  accountId,
}: {
  page: GardenPage;
  accountId: string;
}) {
  const save = usePageAutosave(page, accountId);
  return (
    <Puck
      config={gardenConfig}
      data={page.content}
      onChange={(data) => save.change({ content: documentData(data) })}
      overrides={{ actionBar: () => <></> }}
    >
      <EditorSync content={save.working.content} />
      <Workspace
        page={page}
        title={save.working.title}
        visibility={save.working.visibility}
        status={save.status}
        error={save.error}
        retry={save.retry}
        onMetadata={save.change}
        feedback={
          <SaveFeedback
            key={save.comparison?.saved.version ?? "feedback"}
            save={save}
          />
        }
      />
    </Puck>
  );
}
