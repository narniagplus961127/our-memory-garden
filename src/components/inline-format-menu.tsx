"use client";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { DestinationPicker } from "./destination-picker";
import { destinationHref, type Destination } from "@/lib/destinations";
import { textColour } from "@/lib/text-appearance";

function PixelControl({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  onCommit,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step?: number;
  disabled: boolean;
  onCommit: (value: string | null) => void;
}) {
  const [draft, setDraft] = useState(value);
  const cancelled = useRef(false);
  useEffect(() => setDraft(value), [value]);
  const valid =
    draft === "" ||
    (Number.isFinite(Number(draft)) &&
      /^-?\d+(?:\.\d{1,2})?$/.test(draft) &&
      Number(draft) >= min &&
      Number(draft) <= max);
  return (
    <label className="format-pixels">
      <span>{label} · px</span>
      <input
        type="number"
        aria-label={label}
        title={
          label +
          " in pixels (" +
          min +
          " to " +
          max +
          "); leave blank for default"
        }
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder="Auto"
        value={draft}
        aria-invalid={!valid}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => {
          cancelled.current = false;
        }}
        onBlur={() => {
          if (cancelled.current || !valid) {
            setDraft(value);
            return;
          }
          if (valid && draft !== value)
            onCommit(draft === "" ? null : Number(draft) + "px");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            cancelled.current = true;
            setDraft(value);
            event.currentTarget.blur();
          }
        }}
      />
    </label>
  );
}

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
  const colourDialog = useRef<HTMLDialogElement>(null);
  const [colourOpen, setColourOpen] = useState(false),
    [colourDraft, setColourDraft] = useState("#304337");
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
    setColourOpen(false);
    selection.current = null;
  }, [editor]);
  useEffect(() => {
    if (link) dialog.current?.showModal();
  }, [link]);
  useEffect(() => {
    if (colourOpen) colourDialog.current?.showModal();
  }, [colourOpen]);
  const disabled = !editor || editor.isDestroyed;
  const attributes = disabled ? {} : editor.getAttributes("gardenTextStyle");
  const colour = textColour(attributes.color ?? "") ?? "#304337";
  function closeLink() {
    selection.current = null;
    setLink(false);
  }
  const command = () => {
    if (!editor || editor.isDestroyed) return null;
    const range = selection.current;
    selection.current = null;
    return range
      ? editor
          .chain()
          .focus(undefined, { scrollIntoView: false })
          .setTextSelection(range)
      : editor.chain().focus(undefined, { scrollIntoView: false });
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
      <PixelControl
        key={(editor?.instanceId ?? "none") + "size"}
        label="Font size"
        value={String(attributes.fontSize ?? "").replace(/px$/, "")}
        min={8}
        max={120}
        disabled={disabled}
        onCommit={(fontSize) =>
          command()?.setMark("gardenTextStyle", { fontSize }).run()
        }
      />
      <PixelControl
        key={(editor?.instanceId ?? "none") + "spacing"}
        label="Letter spacing"
        value={String(attributes.letterSpacing ?? "").replace(/px$/, "")}
        min={-2}
        max={20}
        step={0.1}
        disabled={disabled}
        onCommit={(letterSpacing) =>
          command()?.setMark("gardenTextStyle", { letterSpacing }).run()
        }
      />
      <button
        type="button"
        disabled={disabled}
        aria-label="Text colour"
        title="Text colour"
        onClick={() => {
          setColourDraft(colour);
          setColourOpen(true);
        }}
      >
        <span className="text-colour-icon" style={{ borderColor: colour }}>
          A
        </span>
      </button>
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
      <button
        type="button"
        disabled={disabled}
        aria-label="Reset text appearance"
        title="Reset colour, font size and letter spacing"
        onClick={() => command()?.unsetMark("gardenTextStyle").run()}
      >
        Reset style
      </button>
      {colourOpen && !disabled && (
        <dialog
          ref={colourDialog}
          className="inline-link-dialog text-colour-dialog"
          aria-label="Choose text colour"
          onClose={() => {
            setColourOpen(false);
            selection.current = null;
          }}
          onCancel={() => {
            setColourOpen(false);
            selection.current = null;
          }}
        >
          <h2>Text colour</h2>
          <p>Apply to your selected words, or the text you type next.</p>
          <div className="text-colour-presets">
            {[
              ["Forest", "#304337"],
              ["Sage", "#59694f"],
              ["Clay", "#a75b43"],
              ["Ink", "#202820"],
              ["White", "#ffffff"],
            ].map(([name, hex]) => (
              <button
                key={name}
                type="button"
                aria-label={name + " text colour"}
                title={name}
                style={{ backgroundColor: hex }}
                onClick={() => setColourDraft(hex)}
              />
            ))}
          </div>
          <label htmlFor="text-colour-hex">Custom hex colour</label>
          <div className="colour-inputs">
            <input
              type="color"
              aria-label="Choose custom text colour"
              value={textColour(colourDraft) ?? colour}
              onChange={(e) => setColourDraft(e.target.value)}
            />
            <input
              id="text-colour-hex"
              value={colourDraft}
              maxLength={7}
              placeholder="#304337"
              aria-invalid={!textColour(colourDraft)}
              aria-describedby="text-colour-help"
              onChange={(e) => setColourDraft(e.target.value)}
            />
          </div>
          <small id="text-colour-help">
            Use a colour picker or enter a hex colour, such as #A75B43.
          </small>
          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={() => colourDialog.current?.close()}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!textColour(colourDraft)}
              onClick={() => {
                command()
                  ?.setMark("gardenTextStyle", {
                    color: textColour(colourDraft),
                  })
                  .run();
                colourDialog.current?.close();
              }}
            >
              Apply colour
            </button>
          </div>
        </dialog>
      )}
      {link && !disabled && (
        <dialog
          ref={dialog}
          className="inline-link-dialog"
          aria-label="Link text to a page or website"
          onClose={closeLink}
          onCancel={closeLink}
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
