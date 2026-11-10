import Link from "next/link";
import { useRouter } from "next/navigation";
import { GripVertical, Pencil } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button, buttonVariants } from "./ui/button";
import { Card } from "./ui/card";
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
        aria-label={showEdit ? "Edit " + title : undefined}
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
