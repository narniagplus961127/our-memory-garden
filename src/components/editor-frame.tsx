"use client";
import { useEffect, type ReactNode } from "react";
export function EditorFrame({
  children,
  document: frameDocument,
}: {
  children: ReactNode;
  document?: Document;
}) {
  useEffect(() => {
    const frame = frameDocument?.defaultView
      ?.frameElement as HTMLIFrameElement | null;
    if (!frameDocument || !frame) return;
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
      <style>{`body { margin:0; overflow-x:clip; } .garden-rich-text { overflow-wrap:anywhere; }`}</style>
      {children}
    </>
  );
}
