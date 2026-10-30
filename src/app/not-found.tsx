import Link from "next/link";
import { GardenHeader } from "@/components/garden-header";
export default async function NotFound() {
  return (
    <>
      <GardenHeader />
      <main className="page-content">
        <h1>Page not found</h1>
        <p>This page is not available.</p>
        <Link className="button" href="/">
          Back to our garden
        </Link>
      </main>
    </>
  );
}
