"use client";
import { useId } from "react";
import { createUsePuck } from "@puckeditor/core";
const useEditor = createUsePuck();

export type BlockSpacing = Partial<
  Record<"top" | "right" | "bottom" | "left", number>
>;
export function BlockSpacingControl({
  value,
  onChange,
  label,
}: {
  value?: BlockSpacing;
  onChange: (value: BlockSpacing) => void;
  label: string;
}) {
  const id = useId();
  const legacyPadding = useEditor((state) => state.selectedItem?.props.padding);
  return (
    <fieldset className="block-spacing">
      <legend>{label} · px</legend>
      <p className="editor-panel-hint">
        {label === "Padding"
          ? "Space inside this block."
          : "Space outside this block."}{" "}
        Leave blank to use the default.
        {label === "Padding" && typeof legacyPadding === "number" && (
          <> Existing all-side padding: {legacyPadding} px.</>
        )}
      </p>
      <div className="spacing-sides">
        {(["top", "right", "bottom", "left"] as const).map((side) => (
          <label key={side} htmlFor={id + side}>
            {side[0].toUpperCase() + side.slice(1)}
            <span className="spacing-value">
              <input
                id={id + side}
                aria-label={label + " " + side}
                type="number"
                min={0}
                max={120}
                step={1}
                placeholder={
                  label === "Padding" && typeof legacyPadding === "number"
                    ? String(legacyPadding)
                    : "Auto"
                }
                value={value?.[side] ?? ""}
                onChange={(event) => {
                  const next = { ...value };
                  if (event.target.value === "") delete next[side];
                  else {
                    const n = Number(event.target.value);
                    if (!Number.isInteger(n) || n < 0 || n > 120) return;
                    next[side] = n;
                  }
                  onChange(next);
                }}
              />
              <span className="spacing-unit" aria-hidden="true">
                px
              </span>
            </span>
          </label>
        ))}
      </div>
      <button
        className="spacing-reset secondary"
        type="button"
        onClick={() => onChange({})}
      >
        Reset {label.toLowerCase()}
      </button>
    </fieldset>
  );
}
