"use client";
import { useId, useRef, useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import type { AdminListOrder } from "@/lib/admin-list-order";
import type { PageCardData } from "@/lib/pages";
import {
  AdminListGrip,
  AdminListActions,
  AdminListOrderStatus,
  AdminListRow,
  ListDragFeedback,
} from "./admin-list-row";
import { useAdminListOrder } from "./use-admin-list-order";
import { TrashAction } from "./page-recovery";
import { Toast } from "./toast";
const pageLabel = (page: PageCardData) => page.title;
const pageSortOptions = [
  { value: "manual", label: "Manual order", field: null, direction: 1 },
  { value: "title-asc", label: "Name A–Z", field: "title", direction: 1 },
  { value: "title-desc", label: "Name Z–A", field: "title", direction: -1 },
  {
    value: "created-desc",
    label: "Created date · newest first",
    field: "created_at",
    direction: -1,
  },
  {
    value: "created-asc",
    label: "Created date · oldest first",
    field: "created_at",
    direction: 1,
  },
  {
    value: "page-date-desc",
    label: "Page date · newest first",
    field: "page_date",
    direction: -1,
  },
  {
    value: "page-date-asc",
    label: "Page date · oldest first",
    field: "page_date",
    direction: 1,
  },
  {
    value: "updated-desc",
    label: "Recently updated",
    field: "updated_at",
    direction: -1,
  },
  {
    value: "updated-asc",
    label: "Least recently updated",
    field: "updated_at",
    direction: 1,
  },
] as const;
const names = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function PageCardDate({
  page,
  field,
}: {
  page: PageCardData;
  field: "created_at" | "updated_at" | "page_date";
}) {
  const date = page[field];
  if (!date) return <span> · No page date</span>;
  const label =
    field === "created_at"
      ? "Created"
      : field === "page_date"
        ? "Page date"
        : "Updated";
  return (
    <span>
      {" · "}
      {label}{" "}
      <time dateTime={date}>
        {new Date(date).toLocaleDateString(
          "en-GB",
          field === "page_date" ? { timeZone: "UTC" } : undefined,
        )}
      </time>
    </span>
  );
}
export function AdminPageCards({
  pages,
  order,
  allowTrash = false,
}: {
  pages: PageCardData[];
  order?: AdminListOrder;
  allowTrash?: boolean;
}) {
  const [notice, setNotice] = useState("");
  const [removal, setRemoval] = useState<PageCardData | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("manual");
  const controlsId = useId();
  const search = query.trim().toLowerCase();
  const option =
    pageSortOptions.find(({ value }) => value === sortKey) ??
    pageSortOptions[0];
  const { field, direction } = option;
  const canReorder = Boolean(order) && !search && field === null;
  const sort = useAdminListOrder(
    "pages",
    pages,
    pageLabel,
    order,
    !canReorder || Boolean(removal),
  );
  const matches = search
    ? sort.ordered.filter(
        ({ title, slug }) =>
          title.toLowerCase().includes(search) ||
          ("/garden/" + slug).includes(search),
      )
    : sort.ordered;
  const visible = field
    ? matches.toSorted((a, b) => {
        const left = a[field];
        const right = b[field];
        // Undated pages follow dated pages in both directions.
        if (!left || !right) return Number(!left) - Number(!right);
        return (
          direction *
          (field === "title"
            ? names.compare(left, right)
            : left.localeCompare(right))
        );
      })
    : matches;
  const dateField =
    field === "created_at" || field === "page_date" ? field : "updated_at";

  return (
    <>
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
      {order && (
        <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(14rem,auto)]">
          <div className="grid min-w-0 gap-2">
            <Label htmlFor={controlsId + "-search"}>Search pages</Label>
            <Input
              id={controlsId + "-search"}
              type="search"
              placeholder="Search by name or URL"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor={controlsId + "-sort"}>Sort by</Label>
            <NativeSelect
              id={controlsId + "-sort"}
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value)}
            >
              {pageSortOptions.map(({ value, label }) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>
      )}
      {visible.length ? (
        <ul className="admin-list admin-page-cards">
          {visible.map((page) => (
            <li key={page.id} {...(canReorder && sort.rowProps(page.id))}>
              <AdminListRow
                title={page.title}
                href={"/admin/pages/" + page.id}
                showEdit={false}
                grip={
                  canReorder && (
                    <AdminListGrip
                      {...sort.handleProps({ id: page.id, label: page.title })}
                    />
                  )
                }
                detail={
                  <>
                    {page.is_homepage && "Homepage · "}
                    {page.visibility === "private" ? "Private" : "Public"}
                    <PageCardDate page={page} field={dateField} />
                  </>
                }
                trailing={
                  allowTrash && (
                    <AdminListActions
                      list="pages"
                      id={page.id}
                      title={page.title}
                      href={"/admin/pages/" + page.id}
                      disabled={sort.busy}
                      removalDisabled={page.is_homepage}
                      onRemove={(trigger) => {
                        returnFocus.current = trigger.current;
                        setRemoval(page);
                      }}
                    />
                  )
                }
              />
            </li>
          ))}
        </ul>
      ) : search ? (
        <div className="empty-state" role="status">
          No pages match your search.
        </div>
      ) : (
        <div className="empty-state">
          <h2>Your first page starts here</h2>
          <p className="muted">
            Create a private page and give a memory a place to grow.
          </p>
        </div>
      )}
      {order && (
        <>
          {canReorder && <ListDragFeedback {...sort} />}
          <AdminListOrderStatus {...sort} />
        </>
      )}
      {removal && (
        <TrashAction
          page={removal}
          list={{
            onClose: () => setRemoval(null),
            returnFocus,
          }}
          onDone={(message) => {
            returnFocus.current = document.getElementById("pages-title");
            setNotice(message);
          }}
        />
      )}
    </>
  );
}
