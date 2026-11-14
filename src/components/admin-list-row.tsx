"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Ellipsis, GripVertical, Pencil, Trash2 } from "lucide-react";
import {
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import type { AdminList } from "@/lib/admin-list-order";
import { ConfirmationDialog } from "./confirmation-dialog";
import { Button, buttonVariants } from "./ui/button";
import { Card } from "./ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import type { useListReorder } from "./use-list-reorder";

export function AdminListRow({
  title,
  detail,
  href,
  grip,
  trailing,
  className = "",
  showEdit = true,
  locked = false,
}: {
  title: string;
  detail?: ReactNode;
  href: string;
  grip?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  showEdit?: boolean;
  locked?: boolean;
}) {
  return (
    <Card className={`admin-list-row ${className}`}>
      {grip}
      <Link
        className="admin-list-edit"
        href={href}
        aria-label={showEdit || trailing ? "Edit " + title : undefined}
        aria-disabled={locked || undefined}
        tabIndex={locked ? -1 : undefined}
        onClick={locked ? (event) => event.preventDefault() : undefined}
      >
        <span className="admin-list-copy">
          <strong>{title}</strong>
          {detail && <small>{detail}</small>}
        </span>
        {showEdit && (
          <span
            aria-hidden="true"
            className={buttonVariants({ variant: "outline", size: "icon" })}
            title={"Edit " + title}
          >
            <Pencil />
          </span>
        )}
      </Link>
      {trailing}
    </Card>
  );
}

const cloneDetails = {
  pages: {
    label: "page",
    description:
      "Create an independent private page with its own URL and a copy of the saved content and settings.",
  },
  categories: {
    label: "category",
    description:
      "Create an empty category with its own name and URL. Pages stay in their current categories.",
  },
  templates: {
    label: "template",
    description: "Create an independent copy of the saved template layout.",
  },
};

export function AdminListActions({
  list,
  id,
  title,
  href,
  onRemove,
  disabled = false,
  removalDisabled = false,
}: {
  list: AdminList;
  id: string;
  title: string;
  href: string;
  onRemove: (trigger: RefObject<HTMLButtonElement | null>) => void;
  disabled?: boolean;
  removalDisabled?: boolean;
}) {
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const openingDialog = useRef(false);
  const requestId = useRef<string | null>(null);
  const pending = useRef(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { label, description } = cloneDetails[list];

  async function clone() {
    if (!requestId.current || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin-list-clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ list, sourceId: id, id: requestId.current }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? `Could not clone this ${label}.`);
      setCloneOpen(false);
      router.push(
        `/admin/${list}/${result.id}${list === "categories" ? "/edit" : ""}`,
      );
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error && !(failure instanceof TypeError)
          ? failure.message
          : "Could not connect. Try again.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            ref={trigger}
            aria-label={`Actions for ${title}`}
            title={`Actions for ${title}`}
            disabled={disabled}
          >
            <Ellipsis aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          collisionPadding={12}
          className="w-44 [&_[role=menuitem]:not([data-disabled])]:cursor-pointer"
          onCloseAutoFocus={(event) => {
            if (openingDialog.current) event.preventDefault();
            openingDialog.current = false;
          }}
        >
          <DropdownMenuItem asChild className="min-h-11">
            <Link href={href}>
              <Pencil aria-hidden="true" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-11"
            onSelect={() => {
              openingDialog.current = true;
              requestId.current = crypto.randomUUID();
              setError("");
              setCloneOpen(true);
            }}
          >
            <Copy aria-hidden="true" />
            Clone
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-11"
            variant="destructive"
            disabled={removalDisabled}
            title={
              removalDisabled
                ? "Choose another homepage in Settings first."
                : undefined
            }
            onSelect={() => {
              openingDialog.current = true;
              onRemove(trigger);
            }}
          >
            <Trash2 aria-hidden="true" />
            {list === "pages" ? "Move to trash" : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {cloneOpen && (
        <ConfirmationDialog
          title={`Clone ${title}?`}
          description={description}
          confirmLabel={`Clone ${label}`}
          retryLabel="Retry clone"
          busy={busy}
          error={error}
          onConfirm={() => void clone()}
          onCancel={() => setCloneOpen(false)}
          returnFocus={trigger}
        />
      )}
    </>
  );
}

export function AdminListGrip(props: ComponentProps<"button">) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="admin-list-drag-handle"
      {...props}
    >
      <GripVertical aria-hidden="true" />
    </Button>
  );
}

export function AdminListOrderStatus({
  busy,
  error,
  conflict,
}: {
  busy: boolean;
  error: string;
  conflict: boolean;
}) {
  const router = useRouter();
  return (
    <>
      {busy && <p role="status">Saving order…</p>}
      {error && (
        <div role="alert">
          <p className="error">{error}</p>
          {conflict && (
            <Button onClick={() => router.refresh()}>Reload list</Button>
          )}
        </div>
      )}
    </>
  );
}

export function ListDragFeedback({
  drag,
  announcement,
  instructionsId,
  dropDescription,
  tree = false,
}: Pick<
  ReturnType<typeof useListReorder>,
  "drag" | "announcement" | "instructionsId" | "dropDescription"
> & { tree?: boolean }) {
  return (
    <>
      <p id={instructionsId} className="visually-hidden">
        {tree
          ? "Drop on the center of a row to nest under it, or near an edge to move alongside it. With the keyboard, press Space to pick up, Up and Down to reorder, Left to outdent, Right to nest under the previous item, Enter to drop, or Escape to cancel."
          : "Drag the grip to reorder items. With the keyboard, press Space to pick up, arrow keys to move, Enter to drop, or Escape to cancel."}
      </p>
      <span
        className="visually-hidden"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </span>
      {drag?.input === "pointer" && (
        <div
          className="navigation-drag-preview"
          aria-hidden="true"
          style={{
            left: Math.max(
              12,
              Math.min(
                drag.x + 14,
                window.innerWidth - Math.min(260, window.innerWidth * 0.7) - 12,
              ),
            ),
            top: Math.max(12, Math.min(drag.y + 14, window.innerHeight - 120)),
          }}
        >
          <span>⠿</span> {drag.label}
          {dropDescription && <small>{dropDescription}</small>}
        </div>
      )}
    </>
  );
}
