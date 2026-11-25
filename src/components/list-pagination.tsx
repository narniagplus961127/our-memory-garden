import Link from "next/link";
import { buttonVariants } from "./ui/button";
import { pageListHref, type PageListQuery } from "@/lib/page-list";

export function ListPagination({
  path,
  page,
  more,
  query,
  extra,
}: {
  path: string;
  page: number;
  more: boolean;
  query?: PageListQuery;
  extra?: Record<string, string>;
}) {
  if (page === 1 && !more) return null;
  return (
    <nav
      className="photo-pagination flex-wrap gap-3"
      aria-label="Page navigation"
    >
      {page > 1 && (
        <Link
          prefetch={false}
          className={buttonVariants({ variant: "outline" })}
          href={pageListHref(path, page - 1, query, extra)}
        >
          Previous
        </Link>
      )}
      <span className="text-sm text-muted-foreground" aria-current="page">
        Page {page}
      </span>
      {more && (
        <Link
          prefetch={false}
          className={buttonVariants({ variant: "outline" })}
          href={pageListHref(path, page + 1, query, extra)}
        >
          Next
        </Link>
      )}
    </nav>
  );
}
