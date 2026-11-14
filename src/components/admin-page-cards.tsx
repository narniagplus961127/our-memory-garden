"use client";
import { useRef, useState } from "react";
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
  const sort = useAdminListOrder(
    "pages",
    pages,
    pageLabel,
    order,
    Boolean(removal),
  );
  return (
    <>
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
      {pages.length ? (
        <ul className="admin-list admin-page-cards">
          {sort.ordered.map((page) => (
            <li key={page.id} {...(order && sort.rowProps(page.id))}>
              <AdminListRow
                title={page.title}
                href={"/admin/pages/" + page.id}
                showEdit={false}
                grip={
                  order && (
                    <AdminListGrip
                      {...sort.handleProps({ id: page.id, label: page.title })}
                    />
                  )
                }
                detail={
                  <>
                    {page.is_homepage && "Homepage · "}
                    {page.visibility === "private" ? "Private" : "Public"}
                    <span>
                      {" "}
                      · Updated{" "}
                      <time dateTime={page.updated_at}>
                        {new Date(page.updated_at).toLocaleDateString("en-GB")}
                      </time>
                    </span>
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
          <ListDragFeedback {...sort} />
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
