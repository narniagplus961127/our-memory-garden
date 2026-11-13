"use client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { NativeSelectOption } from "@/components/ui/native-select";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { Trash2 } from "lucide-react";
import { ConfirmationDialog } from "./confirmation-dialog";
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
import { PhotoGridEditor } from "./photo-grid-settings";
import { TemplatePlaceholdersOnly } from "./editor-photo-controls";
import { EditorPageActions } from "./editor-page-actions";
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
import { usePageDetails } from "./use-page-details";
import { SaveFeedback } from "./save-feedback";
import { Toast } from "./toast";
import { equal } from "@/lib/page-merge";
import { inlinePageData, richPageData, editedPageData } from "@/lib/rich-text";
const useGardenPuck = createUsePuck<typeof gardenConfig>();
const RequestBlockRemoval = createContext<(id: string) => void>(() => {});
const blockLabel = (type: string) =>
  type === "PageGrid"
    ? "Page grid"
    : type === "PhotoGrid"
      ? "Photo grid"
      : type;
type Snapshot = import("@/lib/page-merge").PageSnapshot;
type InsertionNotice = {
  id: string;
  type: string;
  zone: string;
};
function documentData(
  data: Data<
    Record<string, Record<string, unknown>>,
    {
      title?: string;
      showTitle?: boolean;
    }
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
type Target = {
  zone: string;
  label: string;
  items: PageBlock[];
  insideSection: boolean;
};
type OutlineItem = {
  block: PageBlock;
  label: string;
  depth: number;
};
function documentOutline(content: PageBlock[]) {
  const targets: Target[] = [
      {
        zone: "root:default-zone",
        label: "Page",
        items: content,
        insideSection: false,
      },
    ],
    items: OutlineItem[] = [],
    counts: Record<string, number> = {};
  function walk(blocks: PageBlock[], depth: number, insideSection = false) {
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
          insideSection: insideSection || block.type === "Section",
        });
        walk(children, depth + 1, insideSection || block.type === "Section");
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
          : type === "PhotoGrid"
            ? { title: "Photos", keys: ["gridId"] }
            : type === "Gallery"
              ? { title: "Photos", keys: ["photos"] }
              : null;
  const groups =
    type === "Section"
      ? [
          { id: "width", title: "Section width", keys: ["width"] },
          { id: "image", title: "Background image", keys: ["backgroundImage"] },
          {
            id: "content-background",
            title: "Content background",
            keys: ["contentBackground"],
          },
          {
            id: "background",
            title: "Section colour",
            keys: ["background", "backgroundColor"],
          },
          {
            id: "border",
            title: "Border",
            keys: ["borderWidth", "borderColor", "radius"],
          },
          {
            id: "spacing",
            title: "Spacing",
            keys: ["spacing", "paddingSides", "marginSides"],
          },
          {
            id: "alignment",
            title: "Column content alignment",
            keys: ["columnAlignment"],
          },
        ]
      : [
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
              "buttonPadding",
              "buttonRadius",
              "maxColumns",
              "photoGap",
              "photoRadius",
            ],
          },
          {
            id: "background",
            title: "Block background",
            keys: ["backgroundColor"],
          },
          {
            id: "spacing",
            title: "Spacing",
            keys: ["paddingSides", "marginSides"],
          },
          { id: "corners", title: "Corners", keys: ["radius"] },
        ];
  groups.push({ id: "animation", title: "Animation", keys: ["animation"] });
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
        <CanvasEditActions />
      </ActionBar>
    </div>
  ),
};
function CanvasEditActions() {
  const selected = useGardenPuck((state) => state.selectedItem),
    requestRemoval = useContext(RequestBlockRemoval);
  if (!selected) return null;
  return (
    <>
      <ActionBar.Action
        label="Delete"
        onClick={() => requestRemoval(selected.props.id)}
      >
        <Trash2 size={18} />
      </ActionBar.Action>
    </>
  );
}
function BlockRemovalDialog({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const getPuck = useGetPuck();
  const [snapshot] = useState(() => getPuck().getItemById(id));
  const [error, setError] = useState("");
  const nested = snapshot
    ? documentOutline([snapshot as unknown as PageBlock]).items.length - 1
    : 0;
  return (
    <ConfirmationDialog
      title={"Remove " + (snapshot?.type ?? "block") + "?"}
      description={
        nested
          ? `This also removes ${nested} nested ${nested === 1 ? "block" : "blocks"}. Photos stay in the shared media library.`
          : "This removes the block from this page. Photos stay in the shared media library."
      }
      busy={false}
      error={error}
      confirmLabel="Remove block"
      retryLabel="Remove block"
      reloadLabel="Close and review block"
      onCancel={onClose}
      onReload={onClose}
      onConfirm={() => {
        const api = getPuck(),
          current = api.getItemById(id),
          selector = api.getSelectorForId(id);
        if (!current || !selector || !equal(current, snapshot)) {
          setError(
            "The block changed while this popup was open. Close and review it before removing.",
          );
          return;
        }
        const parent = api.getParentById(id),
          parentSelector =
            parent && parent.props.id !== "root"
              ? api.getSelectorForId(parent.props.id)
              : null;
        api.dispatch({
          type: "remove",
          index: selector.index,
          zone: selector.zone,
        });
        api.dispatch({
          type: "setUi",
          ui: { itemSelector: parentSelector ?? null },
        });
        onClose();
      }}
    />
  );
}
type WorkspaceProps = {
  pageSettings?: {
    page: GardenPage;
    accountId: string;
    visibility: GardenPage["visibility"];
    details: ReturnType<typeof usePageDetails>;
    categoryBusy: boolean;
    setCategoryBusy: (busy: boolean) => void;
    getVersion: () => number;
    photoGridSaved: (page: GardenPage) => void;
  };
  canLeave?: () => boolean;
  content: PageData;
  title: string;
  status: string;
  error: string;
  retry?: () => void;
  feedback?: React.ReactNode;
  onMetadata: (changes: Partial<Snapshot>) => void;
  insertion: RefObject<InsertionNotice | null>;
};
function Workspace({
  pageSettings,
  canLeave,
  content,
  title,
  status,
  error,
  retry,
  feedback,
  onMetadata,
  insertion,
}: WorkspaceProps) {
  const page = pageSettings?.page;
  const visibility = pageSettings?.visibility ?? "private";
  const settingsLabel = page ? "Page settings" : "Template settings";
  const detailsStatus = pageSettings?.details.status ?? "Saved";
  const headerStatus =
    (status === "Saved" || status === "Saving…") && detailsStatus !== "Saved"
      ? detailsStatus
      : status;
  const requestRemoval = useContext(RequestBlockRemoval);
  const [panel, setPanel] = useState<
      "content" | "settings" | "outline" | "page" | null
    >("content"),
    [device, setDevice] = useState<"desktop" | "mobile">("desktop"),
    [explicitTarget, setExplicitTarget] = useState<string | null>(null),
    [columns, setColumns] = useState<{
      edit: boolean;
    } | null>(null),
    [moveTarget, setMoveTarget] = useState("root:default-zone"),
    [moveIndex, setMoveIndex] = useState(0);
  const lastSelected = useRef<string | null>(null),
    insertionCursor = useRef<{
      id: string;
      zone: string;
    } | null>(null),
    panelRef = useRef<HTMLElement>(null),
    canvasFocus = useRef<{
      element: HTMLElement;
      range: Range | null;
    } | null>(null);
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
  const blockTargets = targets.filter((item) => item.insideSection);
  const target =
    blockTargets.find(
      (item) => item.zone === (explicitTarget ?? preferredZone),
    ) ?? blockTargets[0];
  const siblings =
    targets.find((item) => item.zone === selection?.zone)?.items ?? [];
  useEffect(() => {
    const added = insertion.current;
    if (added && items.some((item) => item.block.props.id === added.id)) {
      insertion.current = null;
      insertionCursor.current = { id: added.id, zone: added.zone };
      const childSlot = slotNames(added.type)[0];
      setExplicitTarget(childSlot ? added.id + ":" + childSlot : added.zone);
      getPuck().dispatch({ type: "setUi", ui: { itemSelector: null } });
      setPanel("content");
      lastSelected.current = null;
      return;
    }
    if (selected?.props.id && lastSelected.current !== selected.props.id) {
      insertionCursor.current = null;
      setExplicitTarget(null);
      if (!window.matchMedia("(max-width:760px)").matches) setPanel("settings");
    }
    lastSelected.current = selected?.props.id ?? null;
  }, [data, selected?.props.id, getPuck, insertion]);
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
    if (!selected) return false;
    if (selected.type === "Section") return item.zone === "root:default-zone";
    if (!item.insideSection) return false;
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
    layout?: {
      count: number;
      ratio: ColumnRatio;
    },
  ) {
    const api = getPuck();
    const current = selected
      ? api.getSelectorForId(selected.props.id)
      : undefined;
    const destination = type === "Section" ? targets[0] : target;
    if (!destination) return;
    const cursor =
      insertionCursor.current?.zone === destination.zone
        ? api.getSelectorForId(insertionCursor.current.id)
        : undefined;
    const index = cursor
      ? cursor.index + 1
      : !explicitTarget && current?.zone === destination.zone
        ? current.index + 1
        : destination.items.length;
    const id = crypto.randomUUID();
    if (layout) pendingLayout.current = { id, ...layout };
    api.dispatch({
      type: "insert",
      componentType: type,
      destinationIndex: index,
      destinationZone: destination.zone,
      id,
    });
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
    else requestRemoval(selected.props.id);
  }
  const outline = (
    <div className="garden-block-list">
      {items.map((item) => (
        <Button
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
        </Button>
      ))}
    </div>
  );
  return (
    <div
      className={
        "garden-editor editor-inline " +
        (page ? "" : "template-workspace ") +
        "panel-" +
        (panel ?? "closed")
      }
    >
      <header className="garden-workspace-bar">
        <Link
          href={page ? "/admin/pages" : "/admin/templates"}
          className="editor-back"
          onNavigate={
            canLeave
              ? (event) => {
                  if (!canLeave()) event.preventDefault();
                }
              : undefined
          }
        >
          {page ? "← Pages" : "← Templates"}
        </Link>
        <div className="editor-page-identity">
          <Label className="visually-hidden" htmlFor="page-title">
            {page ? "Page title" : "Template name"}
          </Label>
          <Input
            id="page-title"
            value={title}
            maxLength={200}
            onChange={(event) => onMetadata({ title: event.target.value })}
          />
        </div>
        <div className="editor-header-state">
          <span className="editor-visibility-badge">
            {page
              ? visibility === "public"
                ? "Public"
                : "Private"
              : "Template"}
            {page?.is_homepage ? " · Homepage" : ""}
          </span>
          <span
            role="status"
            aria-label={page ? "Auto-save status" : "Template save status"}
            className="editor-save-status"
          >
            {headerStatus}
          </span>
        </div>
        {pageSettings && (
          <EditorPageActions
            page={{ ...pageSettings.page, title }}
            contentSaved={status === "Saved"}
            detailsSaved={
              detailsStatus === "Saved" && !pageSettings.categoryBusy
            }
            getVersion={pageSettings.getVersion}
          />
        )}
      </header>
      {error && (
        <Toast
          message={error + " Your edits remain in this editor."}
          tone="error"
          actionLabel={retry ? "Retry save" : undefined}
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
            ["page", settingsLabel],
          ].map(([key, label]) => (
            <Button
              key={key}
              className="secondary"
              aria-label={
                key === "content"
                  ? "Open content panel"
                  : key === "settings"
                    ? "Open settings panel"
                    : key === "outline"
                      ? "Open outline panel"
                      : settingsLabel
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
            </Button>
          ))}
        </nav>
        <aside
          ref={panelRef}
          className="garden-editor-panel"
          aria-label={
            panel === "page"
              ? settingsLabel
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
              <Button
                className="inspector-back"
                aria-label="Back to content"
                onClick={() => setPanel("content")}
              >
                <EditorIcon name="back" />
              </Button>
            )}
            <h2>
              {panel === "page"
                ? settingsLabel
                : panel === "settings"
                  ? selected
                    ? blockLabel(selected.type)
                    : "Block styles"
                  : panel === "outline"
                    ? page
                      ? "On this page"
                      : "In this template"
                    : "Add content"}
            </h2>
            <Button
              className="secondary"
              aria-label="Close panel"
              onClick={closePanel}
            >
              <EditorIcon name="close" />
            </Button>
          </div>
          <div hidden={panel !== "page"} className="editor-page-settings">
            <div className="settings-field">
              <Label htmlFor="page-settings-title">
                {page ? "Title" : "Template name"}
              </Label>
              <Input
                id="page-settings-title"
                aria-label={
                  page ? "Page settings title" : "Template settings name"
                }
                value={title}
                maxLength={200}
                onChange={(e) => onMetadata({ title: e.target.value })}
              />
            </div>
            <div className="settings-field">
              <Label className="page-title-visibility">
                <Input
                  type="checkbox"
                  checked={data.root?.props?.showTitle !== false}
                  onChange={(event) => {
                    const api = getPuck();
                    onMetadata({
                      content: {
                        ...editedPageData(
                          documentData(api.appState.data),
                          content,
                        ),
                        root: { props: { showTitle: event.target.checked } },
                      },
                    });
                  }}
                />
                Show page title
              </Label>
              <p className="muted page-title-help">
                {page
                  ? "Show the heading on the website. The page name and sharing title stay the same."
                  : "Show the heading on new pages created from this template."}
              </p>
            </div>
            {pageSettings && page && (
              <>
                <PageAddress page={page} accountId={pageSettings.accountId} />
                <div className="settings-field">
                  <Label htmlFor="page-visibility">Visibility</Label>
                  <NativeSelect
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
                    <NativeSelectOption value="private">
                      Private · administrators only
                    </NativeSelectOption>
                    <NativeSelectOption value="public">
                      Public · everyone
                    </NativeSelectOption>
                  </NativeSelect>
                  {page.is_homepage && (
                    <small>The homepage always stays public.</small>
                  )}
                </div>
                <PageDetails
                  page={{ ...page, title }}
                  visibility={visibility}
                  save={pageSettings.details}
                  categoryBusy={pageSettings.categoryBusy}
                  setCategoryBusy={pageSettings.setCategoryBusy}
                />
              </>
            )}
          </div>
          {panel === "content" && (
            <>
              <p className="muted editor-panel-hint">
                {target
                  ? "Add or drag blocks into a section. Click words on the canvas to write."
                  : "Add a section first, then place blocks or columns inside it."}
              </p>
              <Drawer>
                <div className="palette-heading">Start with a section</div>
                <div className="garden-palette section-palette">
                  <div className="palette-card">
                    <Drawer.Item name="Section">
                      {() => (
                        <span>
                          Section <span aria-hidden="true">⠿</span>
                        </span>
                      )}
                    </Drawer.Item>
                    <Button
                      className="secondary palette-add"
                      aria-label="Add Section"
                      onClick={() => insert("Section")}
                    >
                      ＋
                    </Button>
                  </div>
                </div>
                <div className="palette-heading">Blocks</div>
                <div className="garden-palette">
                  {["Text", "Image", "PhotoGrid", "Button", "PageGrid"].map(
                    (name) => (
                      <div className="palette-card" key={name}>
                        {target ? (
                          <Drawer.Item name={name}>
                            {() => (
                              <span>
                                {blockLabel(name)}{" "}
                                <span aria-hidden="true">⠿</span>
                              </span>
                            )}
                          </Drawer.Item>
                        ) : (
                          <span className="palette-unavailable">
                            {blockLabel(name)}
                          </span>
                        )}
                        <Button
                          className="secondary palette-add"
                          aria-label={"Add " + blockLabel(name)}
                          disabled={!target}
                          onClick={() => insert(name as BlockName)}
                        >
                          ＋
                        </Button>
                      </div>
                    ),
                  )}
                </div>
                <div className="palette-heading">Layout</div>
                <div className="garden-palette">
                  {["Columns"].map((name) => (
                    <div className="palette-card" key={name}>
                      {target ? (
                        <Drawer.Item name={name}>
                          {() => (
                            <span>
                              {name} <span aria-hidden="true">⠿</span>
                            </span>
                          )}
                        </Drawer.Item>
                      ) : (
                        <span className="palette-unavailable">{name}</span>
                      )}
                      <Button
                        className="secondary palette-add"
                        aria-label={"Add " + name}
                        disabled={!target}
                        onClick={() => setColumns({ edit: false })}
                      >
                        ＋
                      </Button>
                    </div>
                  ))}
                </div>
              </Drawer>
              {target && (
                <>
                  <Label htmlFor="add-target">Add to</Label>
                  <NativeSelect
                    id="add-target"
                    value={target.zone}
                    onChange={(event) => {
                      insertionCursor.current = null;
                      setExplicitTarget(event.target.value);
                    }}
                  >
                    {blockTargets.map((item) => (
                      <NativeSelectOption key={item.zone} value={item.zone}>
                        {item.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <p className="muted editor-panel-hint">
                    Tap Add to place a block after the selected block, or at the
                    end of your chosen container. Sections are added at page
                    level.
                  </p>
                </>
              )}
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
                    <div className="editor-column-layout-action">
                      <Button
                        className="secondary"
                        onClick={() => setColumns({ edit: true })}
                      >
                        Change column layout
                      </Button>
                    </div>
                  )}
                  <Puck.Fields wrapFields={false} />
                  <section
                    className="editor-block-arrangement"
                    aria-label="Arrange selected block"
                  >
                    <h3>Arrange this block</h3>
                    <div className="block-move-controls">
                      <Button
                        className="secondary"
                        aria-label="Move block up"
                        disabled={!selection || selection.index === 0}
                        onClick={() => action("up")}
                      >
                        ↑ Move up
                      </Button>
                      <Button
                        className="secondary"
                        aria-label="Move block down"
                        disabled={
                          !selection || selection.index >= siblings.length - 1
                        }
                        onClick={() => action("down")}
                      >
                        ↓ Move down
                      </Button>
                      <Button
                        className="secondary"
                        aria-label="Duplicate block"
                        onClick={() => action("duplicate")}
                      >
                        Duplicate
                      </Button>
                      <Button
                        className="secondary"
                        aria-label="Remove block"
                        onClick={() => action("remove")}
                      >
                        Remove
                      </Button>
                    </div>
                    {moveDestination && (
                      <>
                        <div className="editor-move-field">
                          <Label htmlFor="move-target">Move to</Label>
                          <NativeSelect
                            id="move-target"
                            value={moveDestination.zone}
                            onChange={(e) => {
                              setMoveTarget(e.target.value);
                              setMoveIndex(0);
                            }}
                          >
                            {safeTargets.map((item) => (
                              <NativeSelectOption
                                key={item.zone}
                                value={item.zone}
                              >
                                {item.label}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        </div>
                        <div className="editor-move-field">
                          <Label htmlFor="move-position">Position</Label>
                          <NativeSelect
                            id="move-position"
                            value={Math.min(
                              moveIndex,
                              moveDestination.items.length,
                            )}
                            onChange={(e) =>
                              setMoveIndex(Number(e.target.value))
                            }
                          >
                            {Array.from(
                              { length: moveDestination.items.length + 1 },
                              (_, i) => (
                                <NativeSelectOption key={i} value={i}>
                                  {i === moveDestination.items.length
                                    ? "At the end"
                                    : "Before block " + (i + 1)}
                                </NativeSelectOption>
                              ),
                            )}
                          </NativeSelect>
                        </div>
                        <Button
                          className="secondary editor-move-submit"
                          onClick={moveHere}
                        >
                          Move block here
                        </Button>
                      </>
                    )}
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
          aria-label={page ? "Live page canvas" : "Template canvas"}
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
              <Button
                aria-pressed={device === "desktop"}
                onClick={() => setDevice("desktop")}
              >
                <EditorIcon name="desktop" />
                <span className="visually-hidden">Desktop</span>
              </Button>
              <Button
                aria-pressed={device === "mobile"}
                onClick={() => setDevice("mobile")}
              >
                <EditorIcon name="mobile" />
                <span className="visually-hidden">Mobile</span>
              </Button>
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
  const details = usePageDetails(page, accountId, save.detailsSaved);
  const [categoryBusy, setCategoryBusy] = useState(false);
  return (
    <GardenEditor
      initialContent={page.content}
      onContent={(content) => save.change({ content })}
      workspace={{
        pageSettings: {
          page,
          accountId,
          visibility: save.working.visibility,
          details,
          categoryBusy,
          setCategoryBusy,
          getVersion: save.getVersion,
          photoGridSaved: save.photoGridSaved,
        },
        title: save.working.title,
        content: save.working.content,
        status: save.status,
        error: save.error,
        retry: save.retry,
        onMetadata: save.change,
        feedback: (
          <SaveFeedback
            key={save.comparison?.saved.version ?? "feedback"}
            save={save}
          />
        ),
      }}
    />
  );
}

export function GardenEditor({
  initialContent,
  workspace,
  onContent,
}: {
  initialContent: PageData;
  workspace: Omit<WorkspaceProps, "insertion">;
  onContent: (content: PageData) => void;
}) {
  const initialData = useMemo(
    () => inlinePageData(initialContent),
    [initialContent],
  );
  const [ready, setReady] = useState(false);
  const insertion = useRef<InsertionNotice | null>(null);
  const [removal, setRemoval] = useState<string | null>(null);
  useEffect(() => setReady(true), []);
  return (
    <InlineEditingProvider>
      <TemplatePlaceholdersOnly.Provider value={!workspace.pageSettings}>
        <PhotoGridEditor.Provider
          value={
            workspace.pageSettings
              ? {
                  pageId: workspace.pageSettings.page.id,
                  saved: workspace.pageSettings.photoGridSaved,
                }
              : null
          }
        >
          <RequestBlockRemoval.Provider value={setRemoval}>
            <fieldset
              className="garden-editor-init"
              disabled={!ready}
              aria-busy={!ready}
              aria-label={
                workspace.pageSettings ? "Page editor" : "Template editor"
              }
            >
              <Puck
                permissions={{ delete: false }}
                config={gardenConfig}
                dnd={{ enableDragHandle: true, behavior: "static" }}
                data={initialData}
                onAction={(action) => {
                  if (action.type === "insert" && action.id)
                    insertion.current = {
                      id: action.id,
                      type: action.componentType,
                      zone: action.destinationZone,
                    };
                }}
                onChange={(data) =>
                  onContent(
                    editedPageData(documentData(data), workspace.content),
                  )
                }
                overrides={editorOverrides}
              >
                <EditorSync content={workspace.content} />
                <Workspace
                  {...workspace}
                  insertion={insertion}
                  status={ready ? workspace.status : "Loading editor…"}
                />
                {removal && (
                  <BlockRemovalDialog
                    id={removal}
                    onClose={() => setRemoval(null)}
                  />
                )}
              </Puck>
            </fieldset>
          </RequestBlockRemoval.Provider>
        </PhotoGridEditor.Provider>
      </TemplatePlaceholdersOnly.Provider>
    </InlineEditingProvider>
  );
}
