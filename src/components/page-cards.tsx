import type { PageCard } from "@/lib/organization";
import { responsivePhotoSources } from "@/lib/media";

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
          <a
            href={"/p/" + p.id}
            aria-label={p.title}
            className="garden-card-paper"
          >
            <div className="garden-card-image">
              {p.cover_photo_id ? (
                <img
                  {...responsivePhotoSources(
                    p.cover_photo_id,
                    "(max-width: 670px) 100vw, 340px",
                  )}
                  alt=""
                  loading="lazy"
                />
              ) : (
                <div className="garden-card-cover" aria-hidden="true">
                  ❀
                </div>
              )}
            </div>
            <div className="garden-card-copy">
              <h3>{p.title}</h3>
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
              {p.description?.trim() && (
                <p className="garden-card-description">
                  {p.description.trim()}
                </p>
              )}
            </div>
          </a>
        </article>
      ))}
    </section>
  );
}
