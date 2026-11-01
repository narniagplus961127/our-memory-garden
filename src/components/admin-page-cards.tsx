import Link from "next/link";
import type { GardenPage } from "@/lib/pages";
export function AdminPageCards({
  pages,
  recoveryLinks = false,
}: {
  pages: GardenPage[];
  recoveryLinks?: boolean;
}) {
  return (
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
          {recoveryLinks && (
            <div className="admin-page-card-actions">
              <Link href={"/admin/pages/" + page.id + "/history"}>
                History and recovery
              </Link>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
