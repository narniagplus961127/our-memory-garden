import { MediaLibrary } from "@/components/media-library";
import { requireAdministrator } from "@/lib/server/auth";
export default async function MediaPage() {
  await requireAdministrator();
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
      <MediaLibrary />
    </>
  );
}
