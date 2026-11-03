"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [target, setTarget] = useState<HTMLElement | null>(null),
    [link, setLink] = useState(false),
    [destination, setDestination] = useState<Destination>({
      kind: "external",
      url: "https://",
    });
  const dialog = useRef<HTMLDialogElement>(null);
  const selection = useRef<{ from: number; to: number } | null>(null);
  useEffect(
    () => setTarget(document.getElementById("garden-inline-format")),
    [],
  );
  useEffect(() => {
    if (link) dialog.current?.showModal();
  }, [link]);
  if (!editor || !target) return null;
  const command = () => {
    const range = selection.current;
    selection.current = null;
    return range
      ? editor.chain().focus().setTextSelection(range)
      : editor.chain().focus();
  };
  const small = editor.isActive("gardenSmall"),
    style = small
      ? "small"
      : [1, 2, 3, 4].find((n) => editor.isActive("heading", { level: n }));
  return createPortal(
    <div
      className="inline-format-bar"
      aria-label="Inline text formatting"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => {
        event.stopPropagation();
        if ((event.target as HTMLElement).closest("dialog")) return;
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
        aria-label="Text style"
        value={small ? "small" : style ? "h" + style : "p"}
        onChange={(e) => {
          const chain = command().unsetMark("gardenSmall");
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
          key={mark}
          type="button"
          aria-label={label}
          aria-pressed={editor.isActive(mark)}
          onClick={() => command().toggleMark(mark).run()}
        >
          {icon}
        </button>
      ))}
      <button
        type="button"
        aria-label="Align left"
        aria-pressed={editor.isActive({ textAlign: "left" })}
        onClick={() => command().setTextAlign("left").run()}
      >
        ≡
      </button>
      <button
        type="button"
        aria-label="Align centre"
        aria-pressed={editor.isActive({ textAlign: "center" })}
        onClick={() => command().setTextAlign("center").run()}
      >
        ☰
      </button>
      {allowLinks && (
        <button
          type="button"
          aria-label="Add a link"
          onClick={() => setLink(true)}
        >
          Link
        </button>
      )}
      {allowLinks && editor.isActive("link") && (
        <button type="button" onClick={() => command().unsetLink().run()}>
          Remove link
        </button>
      )}
      {link && (
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
                    .extendMarkRange("link")
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
    </div>,
    target,
  );
}
