import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./pixel-theme.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PhotoUploadProvider } from "@/components/photo-uploads";
import { gardenColourVariables } from "@/lib/garden-colours";
const pixelFont = localFont({
  src: "./fonts/fusion-pixel.woff2",
  variable: "--font-pixel",
  display: "swap",
  adjustFontFallback: false,
  fallback: ["Arial", "sans-serif"],
});
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
    <html
      lang="en"
      className={pixelFont.variable}
      data-theme="pixel-garden"
      style={gardenColourVariables}
    >
      <body>
        <TooltipProvider>
          <PhotoUploadProvider>{children}</PhotoUploadProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
