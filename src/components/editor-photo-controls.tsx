"use client";
import { createContext, useContext, type ReactNode } from "react";

export const TemplatePlaceholdersOnly = createContext(false);

export function PhotoControls({
  children,
  field = false,
}: {
  children: ReactNode;
  field?: boolean;
}) {
  if (!useContext(TemplatePlaceholdersOnly)) return children;
  return field ? (
    <p className="muted">
      Add photos after creating a page from this template.
    </p>
  ) : null;
}
