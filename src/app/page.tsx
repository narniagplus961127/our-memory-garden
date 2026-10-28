import { PublicHeader, GardenCat } from "@/components/brand";
export default function HomePage() {
  return (
    <>
      <PublicHeader />
      <main className="page-content">
        <p className="eyebrow">Our garden</p>
        <h1>Our Memory Garden</h1>
        <p className="muted">A little place for the moments we share.</p>
        <p>The garden is being prepared.</p>
        <GardenCat />
      </main>
    </>
  );
}
