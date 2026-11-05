import Link from "next/link";
import { PublicMenu } from "./public-menu";
import { AdminShortcuts } from "./admin-shortcuts";
import { WebsiteNavigation } from "./website-navigation";
export function Brand() {
  return (
    <Link className="brand" href="/">
      <img src="/brand/seedlings.svg" alt="" width={36} height={36} />
      <span>Our Memory Garden</span>
    </Link>
  );
}
export function PublicHeader({
  items = [],
  editPageId,
}: {
  items?: import("@/lib/destinations").PublicMenuItem[];
  editPageId?: string;
}) {
  return (
    <>
      <header className="public-header">
        <Brand />
        {items.length > 0 && (
          <>
            <nav className="public-nav" aria-label="Main navigation">
              <WebsiteNavigation items={items} />
            </nav>
            <PublicMenu>
              <WebsiteNavigation items={items} mobile />
            </PublicMenu>
          </>
        )}
      </header>
      <AdminShortcuts editPageId={editPageId} />
    </>
  );
}
export function GardenCat() {
  return (
    <svg
      className="garden-cat"
      viewBox="0 0 64 78"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 48C4 33 10 25 20 24L17 10 30 18 41 10 43 27C53 35 54 47 48 54 42 61 24 61 16 57 5 57 0 63 4 69 9 77 28 73 37 69M23 34h4m9 0h4m-12 8q4 5 8 0" />
    </svg>
  );
}
