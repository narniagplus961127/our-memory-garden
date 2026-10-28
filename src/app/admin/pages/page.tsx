import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
import { listPages } from "@/lib/server/pages";
import { NewPageForm } from "@/components/new-page-form";
export default async function Pages() {
  const pages = await listPages(await requireAdministrator());
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Your garden</p>
          <h1>Pages</h1>
          <p className="muted">A home for your photographs and words.</p>
        </div>
        <NewPageForm />
      </div>
      {pages.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Visibility</th>
                <th>Last tended</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => (
                <tr key={page.id}>
                  <td>
                    <Link href={"/admin/pages/" + page.id}>{page.title}</Link>
                    {page.is_homepage && (
                      <span className="badge homepage-label">Homepage</span>
                    )}
                  </td>
                  <td>
                    <span className="badge">
                      {page.visibility === "private" ? "Private" : "Public"}
                    </span>
                  </td>
                  <td>
                    <small>
                      {new Date(page.updated_at).toLocaleDateString("en-GB")}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
