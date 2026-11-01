import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdministrator } from "@/lib/server/auth";
import {
  pageHistory,
  historicalPage,
  inboundReferences,
} from "@/lib/server/page-recovery";
import { RestoreVersion, TrashAction } from "@/components/page-recovery";
import { GardenContent } from "@/components/garden-content";
import { RequestError } from "@/lib/server/http";
import { categories } from "@/lib/server/organization";
import { displayPhotoUrl } from "@/lib/media";
export default async function History({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  await requireAdministrator();
  const id = (await params).id;
  try {
    const { page, groups } = await pageHistory(id);
    const requested = (await searchParams).version;
    const version = requested
      ? Number(requested)
      : groups[0]?.versions[0]?.version;
    if (requested && (!Number.isSafeInteger(version) || Number(version) < 1))
      notFound();
    const selected = version
      ? (await historicalPage(id, version)).snapshot
      : null;
    const [{ references }, categoryList] = await Promise.all([
      inboundReferences(id),
      categories(),
    ]);
    return (
      <>
        <Link href="/admin/pages">← Pages</Link>
        <div className="admin-heading">
          <div>
            <p className="eyebrow">Saved memories</p>
            <h1>Version history</h1>
            <p>{page.title}</p>
          </div>
          <Link
            className="button secondary"
            href={page.deleted_at ? "/admin/trash" : "/admin/pages/" + id}
          >
            {page.deleted_at ? "Back to trash" : "Return to editor"}
          </Link>
        </div>
        <div className="history-layout">
          <nav aria-label="Saved versions">
            {groups.length ? (
              groups.map((g) => (
                <details key={g.id} open>
                  <summary>
                    {new Date(g.versions[0].updated_at).toLocaleString("en-GB")}{" "}
                    · {g.versions[0].actor} · {g.versions.length}{" "}
                    {g.versions.length === 1 ? "revision" : "revisions"}
                  </summary>
                  {g.versions.map((v) => (
                    <Link
                      key={v.version}
                      href={"?version=" + v.version}
                      aria-current={v.version === version ? "page" : undefined}
                    >
                      Version {v.version} · {v.reason} ·{" "}
                      {new Date(v.updated_at).toLocaleTimeString("en-GB")}
                    </Link>
                  ))}
                </details>
              ))
            ) : (
              <p>No earlier versions yet. Saved edits will appear here.</p>
            )}
          </nav>
          <section aria-label="Read-only saved snapshot">
            {selected && (
              <>
                <p className="eyebrow">Read-only · Version {version}</p>
                <h2>{selected.title}</h2>
                <dl className="history-metadata">
                  <dt>Date</dt>
                  <dd>{selected.page_date ?? "No date"}</dd>
                  <dt>Category</dt>
                  <dd>
                    {categoryList.find((c) => c.id === selected.category_id)
                      ?.name ?? "No category"}
                  </dd>
                </dl>
                {selected.cover_photo_id && (
                  <figure className="history-cover">
                    <img
                      src={displayPhotoUrl(selected.cover_photo_id)}
                      alt="Saved page cover"
                    />
                    <figcaption>Saved cover photo</figcaption>
                  </figure>
                )}
                <p>
                  This is saved content. Links and photo access follow current
                  page visibility.
                </p>
                <div className="history-snapshot">
                  <GardenContent data={selected.content} />
                </div>
                <RestoreVersion key={version} page={page} revision={version} />
              </>
            )}
          </section>
        </div>
        <section className="recovery-trash">
          <h2>Page recovery</h2>
          <TrashAction page={page} references={references} />
        </section>
      </>
    );
  } catch (e) {
    if (e instanceof RequestError && e.status === 404) notFound();
    throw e;
  }
}
