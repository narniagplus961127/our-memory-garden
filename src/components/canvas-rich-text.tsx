"use client";
import { createUsePuck } from "@puckeditor/core";
import type { ReactNode } from "react";
const useEditor = createUsePuck();
export function CanvasRichText({
  id,
  type,
  children,
}: {
  id: string;
  type: string;
  children: ReactNode;
}) {
  const selected = useEditor((state) => state.selectedItem?.props.id === id);
  return (
    <div
      role="group"
      aria-label={(selected ? "Selected " : "") + type + " block"}
    >
      {children}
    </div>
  );
}
