"use client";
import { GardenErrorState } from "@/components/garden-error-state";
import "./globals.css";
import "./pixel-theme.css";
export default function GlobalError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <html lang="en" data-theme="pixel-garden">
      <body>
        <title>Temporarily unavailable · Our Memory Garden</title>
        <GardenErrorState retry={retry} />
      </body>
    </html>
  );
}
