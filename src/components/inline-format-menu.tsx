"use client";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { DestinationPicker } from "./destination-picker";
import { destinationHref, type Destination } from "@/lib/destinations";

export function InlineFormatMenu({
  editor,
  allowLinks = true,
}: {
  editor: Editor | null;
  allowLinks?: boolean;
}) {
  const [link, setLink] = useState(false),
    [destination, setDestination] = useState<Destination>({
      kind: "external",
      url: "https://",
    });
  const dialog = useRef<HTMLDialogElement>(null);
  const selection = useRef<{ from: number; to: number } | null>(null);
  const [, refresh] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const update = () => refresh((value) => value + 1);
    editor.on("transaction", update);
    return () => {
      editor.off("transaction", update);
    };
  }, [editor]);
  useEffect(() => {
    setLink(false);
    selection.current = null;
  }, [editor]);
  useEffect(() => {
    if (link) dialog.current?.showModal();
  }, [link]);
  const disabled = !editor || editor.isDestroyed;
  const command = () => {
    if (!editor || editor.isDestroyed) return null;
    const range = selection.current;
    selection.current = null;
    return range
      ? editor.chain().focus().setTextSelection(range)
      : editor.chain().focus();
  };
  const small = editor?.isActive("gardenSmall"),
    style = small
      ? "small"
      : [1, 2, 3, 4].find((n) => editor?.isActive("heading", { level: n }));
  return (
    <div
      className="inline-format-bar"
      aria-label="Inline text formatting"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        event.stopPropagation();
        if ((event.target as HTMLElement).closest("dialog")) return;
        if (!editor || editor.isDestroyed) return;
        selection.current = {
          from: editor.state.selection.from,
          to: editor.state.selection.to,
        };
        if ((event.target as HTMLElement).closest("button"))
          event.preventDefault();
      }}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("dialog")) return;
        if ((e.target as HTMLElement).closest("button")) e.preventDefault();
      }}
    >
      <select
        disabled={disabled}
        aria-label="Text style"
        value={small ? "small" : style ? "h" + style : "p"}
        onChange={(e) => {
          const chain = command()?.unsetMark("gardenSmall");
          if (!chain) return;
          if (e.target.value === "small")
            chain.setParagraph().setMark("gardenSmall").run();
          else if (e.target.value === "p") chain.setParagraph().run();
          else
            chain
              .setHeading({
                level: Number(e.target.value.slice(1)) as 1 | 2 | 3 | 4,
              })
              .run();
        }}
      >
        <option value="p">Paragraph</option>
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={"h" + n}>
            {"H" + n}
          </option>
        ))}
        <option value="small">Small</option>
      </select>
      {[
        ["Bold", "bold", "B"],
        ["Italic", "italic", "I"],
        ["Underline", "underline", "U"],
      ].map(([label, mark, icon]) => (
        <button
          disabled={disabled}
          key={mark}
          type="button"
          aria-label={label}
          aria-pressed={editor?.isActive(mark) ?? false}
          onClick={() => command()?.toggleMark(mark).run()}
        >
          {icon}
        </button>
      ))}
      <button
        disabled={disabled}
        type="button"
        aria-label="Align left"
        aria-pressed={editor?.isActive({ textAlign: "left" }) ?? false}
        onClick={() => command()?.setTextAlign("left").run()}
      >
        ≡
      </button>
      <button
        disabled={disabled}
        type="button"
        aria-label="Align centre"
        aria-pressed={editor?.isActive({ textAlign: "center" }) ?? false}
        onClick={() => command()?.setTextAlign("center").run()}
      >
        ☰
      </button>
      {allowLinks && (
        <button
          disabled={disabled}
          type="button"
          aria-label="Add a link"
          onClick={() => setLink(true)}
        >
          Link
        </button>
      )}
      {allowLinks && editor?.isActive("link") && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => command()?.unsetLink().run()}
        >
          Remove link
        </button>
      )}
      {link && !disabled && (
        <dialog
          ref={dialog}
          className="inline-link-dialog"
          aria-label="Link text to a page or website"
          onClose={() => setLink(false)}
          onCancel={() => setLink(false)}
        >
          <h2>Link your words</h2>
          <DestinationPicker
            value={destination}
            onChange={(value) => {
              if (value) setDestination(value);
            }}
          />
          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!destinationHref(destination)}
              onClick={() => {
                const href = destinationHref(destination);
                if (href)
                  command()
                    ?.extendMarkRange("link")
                    .setLink({ href, target: null, rel: null })
                    .run();
                dialog.current?.close();
              }}
            >
              Apply link
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
