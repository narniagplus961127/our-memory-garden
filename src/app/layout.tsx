import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "Our Memory Garden", template: "%s · Our Memory Garden" },
  description: "A little place for the moments we share.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
