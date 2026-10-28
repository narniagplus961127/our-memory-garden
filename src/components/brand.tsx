import Link from "next/link";
export function Brand() {
  return (
    <Link className="brand" href="/">
      <img src="/brand/garden-gate-mark.png" alt="" />
      <span>Our Memory Garden</span>
    </Link>
  );
}
export function PublicHeader() {
  return (
    <header className="public-header">
      <Brand />
      <nav className="public-nav" aria-label="Main navigation">
        <Link href="/">Our garden</Link>
        <Link className="button secondary" href="/login">
          Garden dashboard
        </Link>
      </nav>
      <details className="public-menu">
        <summary aria-label="Open website menu">☰</summary>
        <nav aria-label="Mobile navigation">
          <Link href="/">Home</Link>
          <Link href="/login">Admin sign in</Link>
        </nav>
      </details>
    </header>
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
