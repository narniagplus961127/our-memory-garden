import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PhotoUploadProvider } from "@/components/photo-uploads";
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
      <body>
        <TooltipProvider>
          <PhotoUploadProvider>{children}</PhotoUploadProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
