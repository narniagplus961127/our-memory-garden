"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import { signOutEditors } from "@/lib/editor-recovery";
import { UsageWarning } from "./usage-settings";
import { usePhotoUploadQueue } from "./photo-uploads";
import { ConfirmationDialog } from "./confirmation-dialog";
const navigation = [
  ["Overview", "/admin"],
  ["Pages", "/admin/pages"],
  ["Templates", "/admin/templates"],
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
  const uploads = usePhotoUploadQueue();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false),
    [signOutError, setSignOutError] = useState("");
  async function signOut() {
    setConfirmSignOut(false);
    setSigningOut(true);
    setSignOutError("");
    uploads.stop(accountId);
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error();
      signOutEditors(accountId);
      window.location.assign("/login");
    } catch {
      setSigningOut(false);
      setSignOutError("Could not sign out. Check your connection and retry.");
    }
  }
  if (/^\/admin\/(pages|templates)\/[0-9a-f-]{36}$/i.test(pathname))
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
  const signOutAction = (
    <>
      <form
        action="/api/auth/logout"
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          if (uploads.getSnapshot().unfinished) setConfirmSignOut(true);
          else void signOut();
        }}
      >
        <Button
          type="submit"
          variant="ghost"
          className="admin-sign-out"
          disabled={!ready || signingOut}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
        {signOutError && <p role="alert">{signOutError}</p>}
      </form>
    </>
  );
  return (
    <div className="admin-shell">
      {confirmSignOut && (
        <ConfirmationDialog
          title="Stop uploads and sign out?"
          description="Unfinished uploads in this tab will stop. Photos already uploaded stay in the library, and photos already processing may still finish."
          busy={signingOut}
          error=""
          confirmLabel="Stop uploads and sign out"
          retryLabel="Try again"
          onConfirm={() => void signOut()}
          onCancel={() => setConfirmSignOut(false)}
        />
      )}
      <aside className="admin-sidebar">
        <div
          className="sidebar-scroll"
          role="region"
          aria-label="Sidebar navigation"
          tabIndex={0}
        >
          <Brand newTab />
          <div>
            <p className="eyebrow">Your garden</p>
            <nav aria-label="Administration">
              {links}
              {signOutAction}
            </nav>
          </div>
        </div>
      </aside>
      <header className="admin-mobile-bar">
        <Brand newTab />
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
            {signOutAction}
          </nav>
        </details>
      </header>
      <main className="admin-main">
        <UsageWarning />
        {children}
      </main>
    </div>
  );
}
