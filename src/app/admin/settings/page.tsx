import Link from "next/link";
export default function SettingsPage() {
  return (
    <>
      <p className="eyebrow">Your garden</p>
      <h1>Settings</h1>
      <p className="muted">Care for the little details of your garden.</p>
      <div className="settings-card">
        <h2>Homepage</h2>
        <p>Choose the public page that welcomes visitors.</p>
        <Link href="/admin/settings/homepage">Manage homepage →</Link>
      </div>
      <div className="settings-card">
        <h2>Account</h2>
        <p>Manage your sign-in and password.</p>
        <Link href="/admin/settings/account">Manage account →</Link>
      </div>
    </>
  );
}
