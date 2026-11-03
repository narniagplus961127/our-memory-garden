"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Editor } from "@tiptap/core";

type ActiveText = { editor: Editor; blockId: string; allowLinks: boolean };
const InlineEditing = createContext<{
  active: ActiveText | null;
  activate: (text: ActiveText) => void;
} | null>(null);
export function InlineEditingProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveText | null>(null);
  const activate = useCallback((text: ActiveText) => {
    setActive((current) =>
      current?.editor === text.editor &&
      current.blockId === text.blockId &&
      current.allowLinks === text.allowLinks
        ? current
        : text,
    );
  }, []);
  useEffect(() => {
    if (!active) return;
    const clear = () =>
      setActive((current) =>
        current?.editor === active.editor ? null : current,
      );
    active.editor.on("destroy", clear);
    return () => {
      active.editor.off("destroy", clear);
    };
  }, [active]);
  const value = useMemo(() => ({ active, activate }), [active, activate]);
  return (
    <InlineEditing.Provider value={value}>{children}</InlineEditing.Provider>
  );
}
export function useActiveInlineText() {
  return useContext(InlineEditing)?.active ?? null;
}

// Puck's contextual menu follows hovered blocks. Remember the focused text editor
// separately so the workspace toolbar is stable when that contextual menu unmounts.
export function InlineEditorBridge({
  editor,
  allowLinks,
}: {
  editor: Editor | null;
  allowLinks: boolean;
}) {
  const activate = useContext(InlineEditing)?.activate;
  useEffect(() => {
    if (!editor || editor.isDestroyed || !activate) return;
    const focus = () => {
      const blockId = editor.view.dom
        .closest("[data-garden-block-id]")
        ?.getAttribute("data-garden-block-id");
      if (blockId) activate({ editor, blockId, allowLinks });
    };
    editor.on("focus", focus);
    if (editor.isFocused) focus();
    return () => {
      editor.off("focus", focus);
    };
  }, [editor, allowLinks, activate]);
  return null;
}
