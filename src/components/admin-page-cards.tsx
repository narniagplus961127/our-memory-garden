"use client";
import { useState } from "react";
import type { AdminListOrder } from "@/lib/admin-list-order";
import type { PageCardData } from "@/lib/pages";
import {
  AdminListGrip,
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
  const sort = useAdminListOrder("pages", pages, pageLabel, order);
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
                showEdit={allowTrash}
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
                    <TrashAction
                      page={page}
                      icon
                      disabled={sort.busy}
                      onDone={(message) => {
                        setNotice(message);
                        requestAnimationFrame(() =>
                          document.getElementById("pages-title")?.focus(),
                        );
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
    </>
  );
}
