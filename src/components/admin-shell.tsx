"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "./brand";
const navigation = [
  ["Overview", "/admin"],
  ["Pages", "/admin/pages"],
  ["Media library", "/admin/media"],
  ["Navigation", "/admin/navigation"],
  ["Settings", "/admin/settings"],
];
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const links = navigation.map(([label, path]) => (
    <Link
      href={path}
      key={path}
      aria-current={
        (path === "/admin" ? pathname === path : pathname.startsWith(path))
          ? "page"
          : undefined
      }
    >
      {label}
    </Link>
  ));
  const bottom = (
    <>
      <Link href="/">View website ↗</Link>
      <Link href="/admin/settings/account">Account</Link>
      <form action="/api/auth/logout" method="post">
        <button type="submit">Sign out</button>
      </form>
    </>
  );
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Brand />
        <div>
          <p className="eyebrow">Your garden</p>
          <nav aria-label="Administration">{links}</nav>
        </div>
        <div className="sidebar-bottom">{bottom}</div>
      </aside>
      <header className="admin-mobile-bar">
        <Brand />
        <details>
          <summary aria-label="Open administration menu">☰</summary>
          <nav aria-label="Mobile administration">
            {links}
            {bottom}
          </nav>
        </details>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
