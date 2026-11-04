"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Brand } from "./brand";
import { signOutEditors } from "@/lib/editor-recovery";
const navigation = [
  ["Overview", "/admin"],
  ["Pages", "/admin/pages"],
  ["Categories", "/admin/categories"],
  ["Media library", "/admin/media"],
  ["Navigation", "/admin/navigation"],
  ["Settings", "/admin/settings"],
];
export function AdminShell({
  children,
  accountId,
}: {
  children: React.ReactNode;
  accountId: string;
}) {
  const pathname = usePathname();
  const mobileMenu = useRef<HTMLDetailsElement>(null);
  const [signingOut, setSigningOut] = useState(false),
    [signOutError, setSignOutError] = useState("");
  if (/^\/admin\/pages\/[0-9a-f-]{36}$/i.test(pathname))
    return <main className="editor-admin-main">{children}</main>;
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
      <form
        action="/api/auth/logout"
        method="post"
        onSubmit={async (event) => {
          event.preventDefault();
          setSigningOut(true);
          setSignOutError("");
          try {
            const response = await fetch("/api/auth/sign-out", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: "{}",
            });
            if (!response.ok) throw new Error();
            // Other tabs can now visit /login without an active session redirecting them back.
            signOutEditors(accountId);
            window.location.assign("/login");
          } catch {
            setSigningOut(false);
            setSignOutError(
              "Could not sign out. Check your connection and retry.",
            );
          }
        }}
      >
        <Button type="submit" disabled={signingOut}>
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
        {signOutError && <p role="alert">{signOutError}</p>}
      </form>
    </>
  );
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div
          className="sidebar-scroll"
          role="region"
          aria-label="Sidebar navigation"
          tabIndex={0}
        >
          <Brand />
          <div>
            <p className="eyebrow">Your garden</p>
            <nav aria-label="Administration">{links}</nav>
          </div>
        </div>
        <div className="sidebar-bottom">{bottom}</div>
      </aside>
      <header className="admin-mobile-bar">
        <Brand />
        <details ref={mobileMenu}>
          <summary aria-label="Open administration menu">☰</summary>
          <nav
            aria-label="Mobile administration"
            onClick={(event) => {
              if (
                event.target instanceof Element &&
                event.target.closest("a") &&
                mobileMenu.current
              )
                mobileMenu.current.open = false;
            }}
          >
            {links}
            {bottom}
          </nav>
        </details>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
