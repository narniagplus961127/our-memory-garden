"use client";
import Link from "next/link";
import { useState } from "react";
import type { PageCardData } from "@/lib/pages";
import { TrashAction } from "./page-recovery";
import { Toast } from "./toast";
export function AdminPageCards({
  pages,
  allowTrash = false,
}: {
  pages: PageCardData[];
  allowTrash?: boolean;
}) {
  const [notice, setNotice] = useState("");
  return (
    <>
      {notice && <Toast message={notice} onDismiss={() => setNotice("")} />}
      {pages.length ? (
        <ul className="admin-page-cards">
          {pages.map((page) => (
            <li key={page.id}>
              <Link href={"/admin/pages/" + page.id}>
                <span className="admin-page-card-title">{page.title}</span>
                <span className="admin-page-card-meta">
                  {page.is_homepage && "Homepage · "}
                  {page.visibility === "private" ? "Private" : "Public"}
                  <span>
                    {" "}
                    · Updated{" "}
                    <time dateTime={page.updated_at}>
                      {new Date(page.updated_at).toLocaleDateString("en-GB")}
                    </time>
                  </span>
                </span>
              </Link>
              {allowTrash && (
                <TrashAction
                  page={page}
                  icon
                  onDone={(message) => {
                    setNotice(message);
                    requestAnimationFrame(() =>
                      document.getElementById("pages-title")?.focus(),
                    );
                  }}
                />
              )}
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
    </>
  );
}
