import type { PageCard } from "@/lib/organization";
import { displayPhotoUrl } from "@/lib/media";

export function PageCards({
  cards,
  showDate = true,
  error,
}: {
  cards: PageCard[];
  showDate?: boolean;
  error?: string;
}) {
  return (
    <section className="garden-block garden-page-grid" aria-label="Page grid">
      {error && <p role="alert">{error}</p>}
      {cards.map((p) => (
        <article className="garden-page-card" key={p.id}>
          <a href={"/p/" + p.id}>
            {p.cover_photo_id ? (
              <img
                src={displayPhotoUrl(p.cover_photo_id)}
                alt=""
                loading="lazy"
              />
            ) : (
              <div className="garden-card-cover" aria-hidden="true">
                ❀
              </div>
            )}
            <h3>{p.title}</h3>
          </a>
          {showDate && p.page_date && (
            <time dateTime={p.page_date}>
              {new Date(p.page_date + "T12:00:00Z").toLocaleDateString(
                "en-GB",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                },
              )}
            </time>
          )}
          {p.visibility === "private" && (
            <small className="muted">Private · only us</small>
          )}
        </article>
      ))}
    </section>
  );
}
