import Link from "next/link";
import { PublicHeader } from "@/components/brand";
export default function NotFound() {
  return (
    <>
      <PublicHeader />
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
