import Link from "next/link";
import { requireAdministrator } from "@/lib/server/auth";
import { ensureHomepage, getHomepage } from "@/lib/server/homepage";
import { listPageCards } from "@/lib/server/pages";
import { HomepageSettings } from "@/components/homepage-settings";

export const metadata = { title: "Homepage settings" };

export default async function HomepageSettingsPage() {
  const administrator = await requireAdministrator();
  await ensureHomepage(administrator);
  const homepage = await getHomepage();
  const pages = (await listPageCards(administrator))
    .filter((page) => page.visibility === "public")
    .map(({ id, title, slug, visibility }) => ({
      id,
      title,
      slug,
      visibility,
    }));
  if (!homepage) return null;
  return (
    <>
      <p className="eyebrow">
        <Link href="/admin/settings">← Settings</Link>
      </p>
      <h1>Homepage</h1>
      <p className="muted">Choose which public page is your homepage.</p>
      <HomepageSettings homepage={homepage} pages={pages} />
    </>
  );
}
