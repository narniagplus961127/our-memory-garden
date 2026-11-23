import { MediaLibrary } from "@/components/media-library";
import { requireAdministrator } from "@/lib/server/auth";
export const metadata = { title: "Media library" };

export default async function MediaPage() {
  const administrator = await requireAdministrator();
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">Gathered moments</p>
          <h1>Media library</h1>
          <p className="muted">
            Your photographs, shared between the two of you.
          </p>
        </div>
      </div>
      <MediaLibrary key={administrator.id} rememberFor={administrator.id} />
    </>
  );
}
