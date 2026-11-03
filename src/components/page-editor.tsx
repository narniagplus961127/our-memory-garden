"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Puck,
  ActionBar,
  Drawer,
  createUsePuck,
  useGetPuck,
  type Data,
  type Overrides,
} from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "./editor.css";
import { EditorFrame } from "./editor-frame";
import { EditorIcon } from "./editor-icons";
import { InlineEditingProvider, useActiveInlineText } from "./inline-editing";
import { InlineFormatMenu } from "./inline-format-menu";
import { ColumnLayoutPicker, type ColumnRatio } from "./column-layout-picker";
import { gardenConfig } from "./garden-blocks";
import { PageAddress } from "./page-address";
import { PageDetails } from "./page-details";
import {
  slotNames,
  slotContent,
  columnSlots,
  type BlockName,
  type PageBlock,
} from "@/lib/blocks";
import type { GardenPage, PageData } from "@/lib/pages";
import { usePageAutosave } from "./use-page-autosave";
import { SaveFeedback } from "./save-feedback";
import { Toast } from "./toast";
import { equal } from "@/lib/page-merge";
import { inlinePageData, richPageData, editedPageData } from "@/lib/rich-text";
const useGardenPuck = createUsePuck<typeof gardenConfig>();
const blockLabel = (type: string) => (type === "PageGrid" ? "Page grid" : type);
type Snapshot = import("@/lib/page-merge").PageSnapshot;
function documentData(
  data: Data<
    Record<string, Record<string, unknown>>,
    { title?: string; showTitle?: boolean }
  >,
): PageData {
  return richPageData({
    root: {
      props:
        data.root?.props?.showTitle === undefined
          ? {}
          : { showTitle: data.root.props.showTitle },
    },
    content: data.content as PageBlock[],
  });
}
function EditorSync({ content }: { content: PageData }) {
  const getPuck = useGetPuck();
  const selected = useGardenPuck((state) => state.selectedItem);
  const selectedId = useRef(selected?.props.id);
  selectedId.current = selected?.props.id;
  useEffect(() => {
    const api = getPuck();
    if (
      equal(
        documentData(api.appState.data),
        richPageData(inlinePageData(content)),
      )
    )
      return;
    const id = selectedId.current;
    api.dispatch({ type: "setData", data: inlinePageData(content) });
    const selector = id ? getPuck().getSelectorForId(id) : undefined;
    api.dispatch({ type: "setUi", ui: { itemSelector: selector ?? null } });
  }, [content, getPuck]);
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
        blockLabel(block.type) +
        " " +
        (counts[block.type] = (counts[block.type] ?? 0) + 1);
      items.push({ block, label, depth });
      for (const slot of slotNames(block.type, block.props.count)) {
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
function reorderBlock(
  getPuck: ReturnType<typeof useGetPuck>,
  id: string,
  offset: number,
) {
  const api = getPuck(),
    selector = api.getSelectorForId(id);
  if (!selector) return;
  const siblings =
    documentOutline(api.appState.data.content as PageBlock[]).targets.find(
      (item) => item.zone === selector.zone,
    )?.items ?? [];
  const index = selector.index + offset;
  if (index < 0 || index >= siblings.length) return;
  api.dispatch({
    type: "reorder",
    sourceIndex: selector.index,
    destinationIndex: index,
    destinationZone: selector.zone,
  });
  api.dispatch({
    type: "setUi",
    ui: { itemSelector: { zone: selector.zone, index } },
  });
}
function CanvasMoveActions() {
  const selected = useGardenPuck((state) => state.selectedItem),
    data = useGardenPuck((state) => state.appState.data),
    getPuck = useGetPuck();
  if (!selected) return null;
  const selector = getPuck().getSelectorForId(selected.props.id),
    siblings =
      documentOutline(data.content as PageBlock[]).targets.find(
        (item) => item.zone === selector?.zone,
      )?.items ?? [];
  return (
    <>
      <ActionBar.Action
        label="Move block up"
        disabled={!selector || selector.index === 0}
        onClick={() => reorderBlock(getPuck, selected.props.id, -1)}
      >
        ↑
      </ActionBar.Action>
      <ActionBar.Action
        label="Move block down"
        disabled={!selector || selector.index >= siblings.length - 1}
        onClick={() => reorderBlock(getPuck, selected.props.id, 1)}
      >
        ↓
      </ActionBar.Action>
    </>
  );
}
function InspectorFields({
  fields,
  isLoading,
}: {
  fields: Record<string, React.ReactNode>;
  isLoading: boolean;
}) {
  const type = useGardenPuck((state) => state.selectedItem?.type);
  const content =
    type === "Image"
      ? { title: "Image", keys: ["photoId", "alt"] }
      : type === "Button"
        ? { title: "Link", keys: ["destination"] }
        : type === "PageGrid"
          ? { title: "Pages", keys: ["selection", "showDate"] }
          : type === "Gallery"
            ? { title: "Photos", keys: ["photos"] }
            : null;
  const groups = [
    ...(content ? [{ id: "content", ...content }] : []),
    ...(type === "Image"
      ? [{ id: "link", title: "Link", keys: ["destination"] }]
      : []),
    {
      id: "layout",
      title:
        type === "Button"
          ? "Button style"
          : type === "Image"
            ? "Image layout"
            : "Layout",
      keys: [
        "variant",
        "width",
        "fit",
        "align",
        "background",
        "spacing",
        "gap",
        "buttonColor",
        "textColor",
      ],
    },
    { id: "background", title: "Block background", keys: ["backgroundColor"] },
    { id: "spacing", title: "Spacing", keys: ["paddingSides", "marginSides"] },
    { id: "corners", title: "Corners", keys: ["radius"] },
  ];
  const assigned = new Set(groups.flatMap((group) => group.keys));
  const others = Object.keys(fields).filter((key) => !assigned.has(key));
  if (others.length)
    groups.push({ id: "other", title: "Other settings", keys: others });
  return (
    <div className="editor-property-fields" aria-busy={isLoading}>
      {groups.map((group) => {
        const keys = group.keys.filter((key) => fields[key]);
        return keys.length ? (
          <details
            className="inspector-section"
            data-section={group.id}
            key={group.id}
            open
          >
            <summary>{group.title}</summary>
            <div className="inspector-section-body">
              {keys.map((key) => (
                <div className="editor-property-field" key={key}>
                  {fields[key]}
                </div>
              ))}
            </div>
          </details>
        ) : null;
      })}
    </div>
  );
}
const editorOverrides: Partial<Overrides<typeof gardenConfig>> = {
  iframe: EditorFrame,
  fields: InspectorFields,
  actionBar: ({ children, label, parentAction, dragHandleRef }) => (
    <div className="garden-canvas-actions">
      <ActionBar label={label}>
        {parentAction}
        {dragHandleRef && (
          <ActionBar.DragHandle
            ref={dragHandleRef}
            label="Drag block"
            aria-label="Drag block"
            data-garden-drag-handle
          />
        )}
        <CanvasMoveActions />
        {children}
      </ActionBar>
    </div>
  ),
};
function Workspace({
  page,
  accountId,
  title,
  visibility,
  status,
  error,
  retry,
  feedback,
  onMetadata,
  onDetailsSaved,
}: {
  page: GardenPage;
  accountId: string;
  title: string;
  visibility: GardenPage["visibility"];
  status: string;
  error: string;
  retry: () => void;
  feedback: React.ReactNode;
  onMetadata: (changes: Partial<Snapshot>) => void;
  onDetailsSaved: (page: GardenPage) => void;
}) {
  const [panel, setPanel] = useState<
      "content" | "settings" | "outline" | "page" | null
    >("content"),
    [device, setDevice] = useState<"desktop" | "mobile">("desktop"),
    [explicitTarget, setExplicitTarget] = useState<string | null>(null),
    [columns, setColumns] = useState<{ edit: boolean } | null>(null),
    [moveTarget, setMoveTarget] = useState("root:default-zone"),
    [moveIndex, setMoveIndex] = useState(0);
  const lastSelected = useRef<string | null>(null),
    panelRef = useRef<HTMLElement>(null),
    canvasFocus = useRef<{ element: HTMLElement; range: Range | null } | null>(
      null,
    );
  const pendingLayout = useRef<{
    id: string;
    count: number;
    ratio: ColumnRatio;
  } | null>(null);
  useEffect(() => {
    if (window.matchMedia("(max-width:760px)").matches) {
      setDevice("mobile");
      setPanel(null);
    }
  }, []);
  const data = useGardenPuck((state) => state.appState.data),
    selected = useGardenPuck((state) => state.selectedItem),
    getPuck = useGetPuck();
  const { targets, items } = documentOutline(data.content as PageBlock[]);
  const activeText = useActiveInlineText();
  const formatEditor =
    (panel === null || panel === "settings") &&
    activeText &&
    activeText.blockId === selected?.props.id &&
    !activeText.editor.isDestroyed
      ? activeText.editor
      : null;
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollTop = 0;
  }, [panel]);
  useEffect(() => {
    const pending = pendingLayout.current;
    if (!pending) return;
    const block = items.find(
      (item) => item.block.props.id === pending.id,
    )?.block;
    const selector = getPuck().getSelectorForId(pending.id);
    if (!block || !selector) return;
    pendingLayout.current = null;
    getPuck().dispatch({
      type: "replace",
      destinationZone: selector.zone,
      destinationIndex: selector.index,
      data: {
        ...block,
        props: { ...block.props, count: pending.count, ratio: pending.ratio },
      },
    });
  }, [data, getPuck, items]);
  const selection = selected
    ? getPuck().getSelectorForId(selected.props.id)
    : undefined;
  const preferredZone =
    selected &&
    slotNames(
      selected.type,
      selected.type === "Columns" ? selected.props.count : undefined,
    )[0]
      ? selected.props.id +
        ":" +
        slotNames(
          selected.type,
          selected.type === "Columns" ? selected.props.count : undefined,
        )[0]
      : selection?.zone;
  const target =
    targets.find((item) => item.zone === (explicitTarget ?? preferredZone)) ??
    targets[0];
  const siblings =
    targets.find((item) => item.zone === selection?.zone)?.items ?? [];
  useEffect(() => {
    if (
      selected?.props.id &&
      lastSelected.current !== selected.props.id &&
      !window.matchMedia("(max-width:760px)").matches
    )
      setPanel("settings");
    lastSelected.current = selected?.props.id ?? null;
  }, [selected?.props.id]);
  function rememberCanvasFocus() {
    const document = documentCanvas();
    const element = document?.activeElement;
    if (element && (element as HTMLElement).isContentEditable) {
      const selection = document?.getSelection();
      canvasFocus.current = {
        element: element as HTMLElement,
        range: selection?.rangeCount
          ? selection.getRangeAt(0).cloneRange()
          : null,
      };
    }
  }
  function documentCanvas() {
    return window.document.querySelector<HTMLIFrameElement>(
      ".garden-canvas-frame iframe",
    )?.contentDocument;
  }
  function closePanel() {
    setPanel(null);
    requestAnimationFrame(() => {
      const saved = canvasFocus.current;
      if (saved?.element.isConnected) {
        saved.element.focus();
        if (saved.range?.commonAncestorContainer.isConnected) {
          const selection = saved.element.ownerDocument.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(saved.range);
        }
      }
    });
  }
  const safeTargets = targets.filter((item) => {
    if (!selected || item.zone === "root:default-zone") return true;
    let id = item.zone.split(":")[0];
    while (id && id !== "root") {
      if (id === selected.props.id) return false;
      id = getPuck().getParentById(id)?.props.id ?? "";
    }
    return true;
  });
  const moveDestination =
    safeTargets.find((item) => item.zone === moveTarget) ?? safeTargets[0];
  function moveHere() {
    if (!selection || !selected || !moveDestination) return;
    const api = getPuck();
    const index = Math.min(moveIndex, moveDestination.items.length);
    if (selection.zone === moveDestination.zone) {
      const next = index > selection.index ? index - 1 : index;
      api.dispatch({
        type: "reorder",
        sourceIndex: selection.index,
        destinationIndex: next,
        destinationZone: selection.zone,
      });
      api.dispatch({
        type: "setUi",
        ui: { itemSelector: { zone: selection.zone, index: next } },
      });
    } else
      api.dispatch({
        type: "move",
        sourceIndex: selection.index,
        sourceZone: selection.zone,
        destinationIndex: index,
        destinationZone: moveDestination.zone,
      });
  }
  function applyColumns(count: number, ratio: ColumnRatio) {
    if (columns?.edit && selected?.type === "Columns") {
      const api = getPuck(),
        selector = api.getSelectorForId(selected.props.id);
      if (!selector) return;
      const current = selected as unknown as PageBlock,
        cells = columnSlots.map((name) => slotContent(current, name).slice());
      cells[count - 1].push(...cells.slice(count).flat());
      for (let n = count; n < 4; n++) cells[n] = [];
      api.dispatch({
        type: "replace",
        destinationZone: selector.zone,
        destinationIndex: selector.index,
        data: {
          ...current,
          props: {
            ...current.props,
            count,
            ratio,
            ...Object.fromEntries(
              columnSlots.map((name, n) => [name, cells[n]]),
            ),
          },
        },
      });
    } else insert("Columns", { count, ratio });
    setColumns(null);
  }
  function select(id: string) {
    const api = getPuck(),
      selector = api.getSelectorForId(id);
    if (selector) {
      api.dispatch({ type: "setUi", ui: { itemSelector: selector } });
      setExplicitTarget(null);
    }
  }
  function insert(
    type: BlockName,
    layout?: { count: number; ratio: ColumnRatio },
  ) {
    const api = getPuck();
    const current = selected
      ? api.getSelectorForId(selected.props.id)
      : undefined;
    const index =
      !explicitTarget && current?.zone === target.zone
        ? current.index + 1
        : target.items.length;
    const id = crypto.randomUUID();
    if (layout) pendingLayout.current = { id, ...layout };
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
    if (window.matchMedia("(max-width:760px)").matches) setPanel(null);
    setExplicitTarget(null);
  }
  function action(kind: "up" | "down" | "duplicate" | "remove") {
    if (!selected) return;
    const api = getPuck(),
      current = api.getSelectorForId(selected.props.id);
    if (!current) return;
    if (kind === "up" || kind === "down") {
      reorderBlock(getPuck, selected.props.id, kind === "up" ? -1 : 1);
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
  const outline = (
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
  );
  return (
    <div className={"garden-editor editor-inline panel-" + (panel ?? "closed")}>
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
            onChange={(event) => onMetadata({ title: event.target.value })}
          />
        </div>
        <div className="editor-header-state">
          <span className="editor-visibility-badge">
            {visibility === "public" ? "Public" : "Private"}
            {page.is_homepage ? " · Homepage" : ""}
          </span>
          <span
            role="status"
            aria-label="Auto-save status"
            className="editor-save-status"
          >
            {status}
          </span>
        </div>
        <a
          className="button secondary editor-view-link"
          href={page.is_homepage ? "/" : "/p/" + page.id}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View page (opens in a new tab)"
        >
          View page <span aria-hidden="true">↗</span>
        </a>
        <Link
          className="button secondary editor-history-link"
          href={"/admin/pages/" + page.id + "/history"}
        >
          History
        </Link>
      </header>
      {error && (
        <Toast
          message={error + " Your edits remain in this editor."}
          tone="error"
          actionLabel="Retry save"
          onAction={retry}
        />
      )}
      <div className="editor-feedback">{feedback}</div>
      <div className="garden-editor-body">
        <nav className="editor-rail" aria-label="Editor panels">
          {[
            ["content", "Content"],
            ["settings", "Styles"],
            ["outline", "Outline"],
            ["page", "Page settings"],
          ].map(([key, label]) => (
            <button
              key={key}
              className="secondary"
              aria-label={
                key === "content"
                  ? "Open content panel"
                  : key === "settings"
                    ? "Open settings panel"
                    : key === "outline"
                      ? "Open outline panel"
                      : "Page settings"
              }
              title={label}
              aria-pressed={panel === key}
              aria-expanded={panel === key}
              onPointerDown={rememberCanvasFocus}
              onClick={() =>
                setPanel(key as "content" | "settings" | "outline" | "page")
              }
            >
              <EditorIcon name={key} />
              <span className="rail-label">{label}</span>
            </button>
          ))}
        </nav>
        <aside
          ref={panelRef}
          className="garden-editor-panel"
          aria-label={
            panel === "page"
              ? "Page settings"
              : panel === "settings"
                ? "Block styles"
                : panel === "outline"
                  ? "Page outline"
                  : "Page content"
          }
          hidden={!panel}
        >
          <div className="panel-heading">
            {panel === "settings" && (
              <button
                className="inspector-back"
                aria-label="Back to content"
                onClick={() => setPanel("content")}
              >
                <EditorIcon name="back" />
              </button>
            )}
            <h2>
              {panel === "page"
                ? "Page settings"
                : panel === "settings"
                  ? selected
                    ? blockLabel(selected.type)
                    : "Block styles"
                  : panel === "outline"
                    ? "On this page"
                    : "Add content"}
            </h2>
            <button
              className="secondary"
              aria-label="Close panel"
              onClick={closePanel}
            >
              <EditorIcon name="close" />
            </button>
          </div>
          <div hidden={panel !== "page"} className="editor-page-settings">
            <div className="settings-field">
              <label htmlFor="page-settings-title">Title</label>
              <input
                id="page-settings-title"
                aria-label="Page settings title"
                value={title}
                maxLength={200}
                onChange={(e) => onMetadata({ title: e.target.value })}
              />
            </div>
            <div className="settings-field">
              <label className="page-title-visibility">
                <input
                  type="checkbox"
                  checked={data.root?.props?.showTitle !== false}
                  onChange={(event) => {
                    const api = getPuck();
                    onMetadata({
                      content: {
                        ...editedPageData(
                          documentData(api.appState.data),
                          page.content,
                        ),
                        root: { props: { showTitle: event.target.checked } },
                      },
                    });
                  }}
                />
                Show page title
              </label>
              <p className="muted page-title-help">
                Show the heading on the website. The page name and sharing title
                stay the same.
              </p>
            </div>
            <PageAddress page={page} accountId={accountId} />
            <div className="settings-field">
              <label htmlFor="page-visibility">Visibility</label>
              <select
                id="page-visibility"
                aria-label="Page visibility"
                value={visibility}
                disabled={page.is_homepage}
                onChange={(e) =>
                  onMetadata({
                    visibility:
                      e.target.value === "public" ? "public" : "private",
                  })
                }
              >
                <option value="private">Private · administrators only</option>
                <option value="public">Public · everyone</option>
              </select>
              {page.is_homepage && (
                <small>The homepage always stays public.</small>
              )}
            </div>
            <PageDetails
              page={{ ...page, title }}
              accountId={accountId}
              visibility={visibility}
              onSaved={onDetailsSaved}
            />
          </div>
          {panel === "content" && (
            <>
              <p className="muted editor-panel-hint">
                Drag a block to a position on your page, or use its Add button.
                Click its words to write.
              </p>
              <Drawer>
                <div className="palette-heading">Blocks</div>
                <div className="garden-palette">
                  {["Text", "Image", "Button", "PageGrid"].map((name) => (
                    <div className="palette-card" key={name}>
                      <Drawer.Item name={name}>
                        {() => (
                          <span>
                            {blockLabel(name)} <span aria-hidden="true">⠿</span>
                          </span>
                        )}
                      </Drawer.Item>
                      <button
                        className="secondary palette-add"
                        aria-label={"Add " + blockLabel(name)}
                        onClick={() => insert(name as BlockName)}
                      >
                        ＋
                      </button>
                    </div>
                  ))}
                </div>
                <div className="palette-heading">Layout</div>
                <div className="garden-palette">
                  {["Columns", "Section"].map((name) => (
                    <div className="palette-card" key={name}>
                      <Drawer.Item name={name}>
                        {() => (
                          <span>
                            {name} <span aria-hidden="true">⠿</span>
                          </span>
                        )}
                      </Drawer.Item>
                      <button
                        className="secondary palette-add"
                        aria-label={"Add " + name}
                        onClick={() =>
                          name === "Columns"
                            ? setColumns({ edit: false })
                            : insert("Section")
                        }
                      >
                        ＋
                      </button>
                    </div>
                  ))}
                </div>
              </Drawer>
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
              <p className="muted editor-panel-hint">
                Tap Add to place a block after the selected block, or at the end
                of your chosen container.
              </p>
            </>
          )}
          {panel === "outline" && outline}
          {panel === "settings" && (
            <>
              {selected ? (
                <>
                  <p className="muted editor-panel-hint">
                    Write on the canvas. Adjust its appearance here.
                  </p>
                  {selected.type === "Columns" && (
                    <button
                      className="secondary"
                      onClick={() => setColumns({ edit: true })}
                    >
                      Change column layout
                    </button>
                  )}
                  <Puck.Fields wrapFields={false} />
                  <section
                    className="editor-block-arrangement"
                    aria-label="Arrange selected block"
                  >
                    <h3>Arrange this block</h3>
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
                    <div className="editor-move-field">
                      <label htmlFor="move-target">Move to</label>
                      <select
                        id="move-target"
                        value={moveDestination.zone}
                        onChange={(e) => {
                          setMoveTarget(e.target.value);
                          setMoveIndex(0);
                        }}
                      >
                        {safeTargets.map((item) => (
                          <option key={item.zone} value={item.zone}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="editor-move-field">
                      <label htmlFor="move-position">Position</label>
                      <select
                        id="move-position"
                        value={Math.min(
                          moveIndex,
                          moveDestination.items.length,
                        )}
                        onChange={(e) => setMoveIndex(Number(e.target.value))}
                      >
                        {Array.from(
                          { length: moveDestination.items.length + 1 },
                          (_, i) => (
                            <option key={i} value={i}>
                              {i === moveDestination.items.length
                                ? "At the end"
                                : "Before block " + (i + 1)}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <button
                      className="secondary editor-move-submit"
                      onClick={moveHere}
                    >
                      Move block here
                    </button>
                  </section>
                </>
              ) : (
                <p className="muted">
                  Select a block on the canvas or in Outline to adjust it.
                </p>
              )}
            </>
          )}
        </aside>
        <section
          className="garden-canvas-workspace"
          aria-label="Live page canvas"
          onClickCapture={(event) => {
            if (
              (event.target as HTMLElement).ownerDocument !== window.document &&
              !window.matchMedia("(max-width:760px)").matches
            )
              setPanel("settings");
          }}
          onFocusCapture={(event) => {
            if (
              (event.target as HTMLElement).ownerDocument !== window.document &&
              !window.matchMedia("(max-width:760px)").matches
            )
              setPanel("settings");
          }}
        >
          <div className="editor-canvas-top">
            <div className="actions device-controls" aria-label="Canvas width">
              <button
                aria-pressed={device === "desktop"}
                onClick={() => setDevice("desktop")}
              >
                <EditorIcon name="desktop" />
                <span className="visually-hidden">Desktop</span>
              </button>
              <button
                aria-pressed={device === "mobile"}
                onClick={() => setDevice("mobile")}
              >
                <EditorIcon name="mobile" />
                <span className="visually-hidden">Mobile</span>
              </button>
            </div>
            <small>
              <span className="desktop-canvas-hint">
                Fit to workspace · live canvas
              </span>
              <span className="mobile-canvas-hint">Swipe tools for more →</span>
            </small>
          </div>
          <div
            id="garden-inline-format"
            className={formatEditor ? "" : "format-hidden"}
            aria-hidden={!formatEditor}
            inert={!formatEditor}
          >
            <InlineFormatMenu
              editor={formatEditor}
              allowLinks={activeText?.allowLinks ?? true}
            />
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
      {columns && (
        <ColumnLayoutPicker
          count={
            columns.edit && selected?.type === "Columns"
              ? (selected.props.count ?? 2)
              : 2
          }
          ratio={
            columns.edit && selected?.type === "Columns"
              ? (selected.props.ratio ?? "equal")
              : "equal"
          }
          onClose={() => setColumns(null)}
          onApply={applyColumns}
        />
      )}
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
  const initialData = useMemo(
    () => inlinePageData(page.content),
    [page.content],
  );
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <InlineEditingProvider>
      <fieldset
        className="garden-editor-init"
        disabled={!ready}
        aria-busy={!ready}
        aria-label="Page editor"
      >
        <Puck
          config={gardenConfig}
          dnd={{ enableDragHandle: true, behavior: "static" }}
          data={initialData}
          onChange={(data) =>
            save.change({
              content: editedPageData(documentData(data), save.working.content),
            })
          }
          overrides={editorOverrides}
        >
          <EditorSync content={save.working.content} />
          <Workspace
            page={page}
            accountId={accountId}
            onDetailsSaved={save.detailsSaved}
            title={save.working.title}
            visibility={save.working.visibility}
            status={ready ? save.status : "Loading editor…"}
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
      </fieldset>
    </InlineEditingProvider>
  );
}
