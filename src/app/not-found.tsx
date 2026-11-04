import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GardenHeader } from "@/components/garden-header";
export default async function NotFound() {
  return (
    <>
      <GardenHeader />
      <main className="page-content">
        <h1>Page not found</h1>
        <p>This page is not available.</p>
        <Button asChild className="button">
          <Link href="/">Back to our garden</Link>
        </Button>
      </main>
    </>
  );
}
