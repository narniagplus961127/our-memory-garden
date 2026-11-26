"use client";
import { createContext, useContext, useEffect, type ReactNode } from "react";
import { gardenColourCss } from "@/lib/garden-colours";
import {
  formatPageDate,
  pageDateAttribute,
  pageDateFormats,
} from "@/lib/page-date";

export const EditorPageDate = createContext<string | null>(null);
export function EditorFrame({
  children,
  document: frameDocument,
}: {
  children: ReactNode;
  document?: Document;
}) {
  const pageDate = useContext(EditorPageDate);
  const dateStyles = pageDateFormats
    .map(({ value }) => {
      const text = formatPageDate(pageDate, value) || "Page date";
      return `span[${pageDateAttribute}="${value}"]::before { content: ${JSON.stringify(text)}; }`;
    })
    .join("\n");
  useEffect(() => {
    const frame = frameDocument?.defaultView
      ?.frameElement as HTMLIFrameElement | null;
    if (!frameDocument || !frame) return;
    // Puck copies stylesheets, but root font variables live on the outer html.
    frameDocument.documentElement.dataset.theme = "pixel-garden";
    frameDocument.documentElement.style.setProperty(
      "--font-pixel",
      getComputedStyle(document.documentElement).getPropertyValue(
        "--font-pixel",
      ),
    );
    const resize = new ResizeObserver(update),
      mutations = new MutationObserver(observe);
    let content: Element | null = null;
    function update() {
      if (content && frame) {
        const height = Math.max(
          650,
          Math.ceil(content.getBoundingClientRect().height) + 48,
        );
        if (frame.style.height !== height + "px")
          frame.style.height = height + "px";
      }
    }
    function observe() {
      const next = frameDocument!.querySelector(".garden-document");
      if (next !== content) {
        resize.disconnect();
        content = next;
        if (content) resize.observe(content);
      }
      update();
    }
    mutations.observe(frameDocument.body, { childList: true, subtree: true });
    observe();
    return () => {
      resize.disconnect();
      mutations.disconnect();
    };
  }, [frameDocument]);
  return (
    <>
      <style>{gardenColourCss}</style>
      <style>{`body { margin:0; overflow-x:clip; } .garden-rich-text { overflow-wrap:anywhere; }`}</style>
      <style>{dateStyles}</style>
      {children}
    </>
  );
}
