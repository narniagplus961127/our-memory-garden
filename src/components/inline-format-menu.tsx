"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { DestinationPicker } from "./destination-picker";
import { destinationHref, type Destination } from "@/lib/destinations";
import { textColour, textFonts } from "@/lib/text-appearance";

function TextNumberControl({
  label,
  value,
  min,
  max,
  step = 1,
  disabled,
  onCommit,
  unit = "px",
  compact = false,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step?: number;
  disabled: boolean;
  onCommit: (value: string | null) => void;
  unit?: "px" | "×";
  compact?: boolean;
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
    <label
      className={"format-pixels" + (compact ? " format-pixels-compact" : "")}
    >
      <span className={compact ? "visually-hidden" : undefined}>
        {label} · {unit}
      </span>
      <input
        type="number"
        aria-label={label}
        title={
          label +
          (unit === "px" ? " in pixels (" : " multiplier (") +
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
            onCommit(
              draft === "" ? null : Number(draft) + (unit === "px" ? "px" : ""),
            );
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            cancelled.current = true;
            setDraft(value);
            event.currentTarget.blur();
          }
        }}
      />
      {compact && (
        <span className="format-number-unit" aria-hidden="true">
          {unit}
        </span>
      )}
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
  const morePanel = useRef<HTMLDivElement>(null),
    moreButton = useRef<HTMLButtonElement>(null),
    moreId = useId(),
    [moreOpen, setMoreOpen] = useState(false),
    [morePosition, setMorePosition] = useState({ left: 0, top: 0 });
  const placeMore = useCallback(() => {
    const panel = morePanel.current,
      button = moreButton.current;
    if (!panel?.matches(":popover-open") || !button) return;
    const trigger = button.getBoundingClientRect(),
      bounds = panel.getBoundingClientRect();
    setMorePosition({
      left: Math.max(
        8,
        Math.min(
          trigger.right - bounds.width,
          window.innerWidth - bounds.width - 8,
        ),
      ),
      top: Math.max(
        8,
        Math.min(trigger.bottom + 8, window.innerHeight - bounds.height - 8),
      ),
    });
  }, []);
  useEffect(() => {
    window.addEventListener("resize", placeMore);
    return () => window.removeEventListener("resize", placeMore);
  }, [placeMore]);
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
    morePanel.current?.hidePopover();
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
  const paragraphType = editor?.isActive("heading") ? "heading" : "paragraph";
  const lineHeight = disabled
    ? ""
    : String(editor.getAttributes(paragraphType).lineHeight ?? "");
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
  function closeMore() {
    morePanel.current?.hidePopover();
    command()?.run();
  }
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
        <option value="p">Body</option>
        {[1, 2, 3, 4].map((n) => (
          <option key={n} value={"h" + n}>
            {"H" + n}
          </option>
        ))}
        <option value="small">Small</option>
      </select>
      <select
        disabled={disabled}
        aria-label="Font family"
        value={attributes.fontFamily ?? ""}
        onChange={(event) =>
          command()
            ?.setMark("gardenTextStyle", {
              fontFamily: event.target.value || null,
            })
            .run()
        }
      >
        <option value="">Site default</option>
        {textFonts.map((font) => (
          <option value={font} key={font}>
            {font}
          </option>
        ))}
      </select>
      <TextNumberControl
        key={(editor?.instanceId ?? "none") + "size"}
        label="Font size"
        compact
        value={String(attributes.fontSize ?? "").replace(/px$/, "")}
        min={8}
        max={120}
        disabled={disabled}
        onCommit={(fontSize) =>
          command()?.setMark("gardenTextStyle", { fontSize }).run()
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
      <button
        disabled={disabled}
        type="button"
        aria-label="Bold"
        aria-pressed={editor?.isActive("bold") ?? false}
        onClick={() => command()?.toggleBold().run()}
      >
        B
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
        className="format-more-trigger"
        ref={moreButton}
        aria-label="More text formatting"
        aria-expanded={moreOpen}
        aria-controls={moreId}
        title="More formatting"
        onClick={() => {
          const panel = morePanel.current;
          if (!panel) return;
          if (panel.matches(":popover-open")) {
            closeMore();
            return;
          }
          panel.showPopover();
          placeMore();
          panel.focus({ preventScroll: true });
        }}
      >
        ⋯
      </button>
      <div
        ref={morePanel}
        id={moreId}
        popover="auto"
        className="format-more"
        role="region"
        tabIndex={-1}
        aria-label="More text formatting"
        style={morePosition}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closeMore();
          }
        }}
        onToggle={(event) => {
          setMoreOpen(event.newState === "open");
          if (event.newState === "closed") selection.current = null;
        }}
      >
        <div className="format-more-heading">
          <strong>More formatting</strong>
          <button
            type="button"
            aria-label="Close more formatting"
            onClick={closeMore}
          >
            ×
          </button>
        </div>
        <div className="format-more-actions">
          {[
            ["Italic", "italic", "I"],
            ["Underline", "underline", "U"],
          ].map(([label, mark, icon]) => (
            <button
              key={mark}
              type="button"
              disabled={disabled}
              aria-label={label}
              title={label}
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
            title="Align left"
            aria-pressed={editor?.isActive({ textAlign: "left" }) ?? false}
            onClick={() => command()?.setTextAlign("left").run()}
          >
            ≡
          </button>
          <button
            disabled={disabled}
            type="button"
            aria-label="Align centre"
            title="Align centre"
            aria-pressed={editor?.isActive({ textAlign: "center" }) ?? false}
            onClick={() => command()?.setTextAlign("center").run()}
          >
            ☰
          </button>
        </div>
        <div className="format-more-spacing">
          <TextNumberControl
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
          <TextNumberControl
            key={(editor?.instanceId ?? "none") + "height"}
            label="Line height"
            unit="×"
            value={lineHeight}
            min={1}
            max={3}
            step={0.1}
            disabled={disabled}
            onCommit={(value) =>
              command()
                ?.updateAttributes(paragraphType, { lineHeight: value })
                .run()
            }
          />
        </div>
        <p>
          Spacing between letters and lines. Leave blank for the site default.
        </p>
        <button
          type="button"
          className="secondary"
          disabled={disabled}
          aria-label="Reset text appearance"
          title="Reset font, colour, size and spacing"
          onClick={() =>
            command()
              ?.unsetMark("gardenTextStyle")
              .updateAttributes(paragraphType, { lineHeight: null })
              .run()
          }
        >
          Reset text style
        </button>
      </div>
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
