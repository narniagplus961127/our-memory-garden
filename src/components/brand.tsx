import Link from "next/link";
import { PublicMenu } from "./public-menu";
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
}: {
  items?: import("@/lib/destinations").PublicMenuItem[];
}) {
  function menu(parentId: string | null): React.ReactNode {
    const children = items.filter((i) => i.parentId === parentId);
    if (!children.length) return null;
    return (
      <ul className="public-menu-items">
        {children.map((i) => (
          <li key={i.id}>
            <a href={i.href}>{i.label}</a>
            {menu(i.id)}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <>
      <header className="public-header">
        <Brand />
        {items.length > 0 && (
          <>
            <nav className="public-nav" aria-label="Main navigation">
              {menu(null)}
            </nav>
            <PublicMenu>{menu(null)}</PublicMenu>
          </>
        )}
      </header>
      <Link
        className="button garden-dashboard-fab"
        href="/admin"
        title="Garden dashboard"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
        <span className="visually-hidden">Garden dashboard</span>
      </Link>
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
