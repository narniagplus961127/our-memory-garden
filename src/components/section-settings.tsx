"use client";
import { BackgroundColour } from "./background-colour";

export type ContentBackground = {
  mode: "auto" | "custom" | "none";
  colour?: string;
};
export function SectionContentBackground({
  value,
  onChange,
}: {
  value?: ContentBackground;
  onChange: (value: ContentBackground) => void;
}) {
  const mode = value?.mode ?? "none";
  return (
    <div className="section-setting">
      <div
        className="section-segments"
        role="group"
        aria-label="Content background"
      >
        {(["auto", "custom", "none"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => onChange({ ...value, mode: option })}
          >
            {option === "auto"
              ? "Auto"
              : option === "custom"
                ? "Custom"
                : "None"}
          </button>
        ))}
      </div>
      <small className="muted">
        Background behind the blocks. Auto uses the garden paper colour.
      </small>
      {mode === "custom" && (
        <BackgroundColour
          label="Content colour"
          defaultLabel="Reset to paper"
          value={value?.colour}
          onChange={(colour) => onChange({ mode, colour })}
        />
      )}
    </div>
  );
}

export function SectionColumnAlignment({
  value,
  onChange,
}: {
  value?: "top" | "center" | "bottom";
  onChange: (value: "top" | "center" | "bottom") => void;
}) {
  return (
    <div
      className="section-segments"
      role="group"
      aria-label="Column content alignment"
    >
      {(["top", "center", "bottom"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={(value ?? "top") === option}
          onClick={() => onChange(option)}
        >
          {option === "top" ? "Top" : option === "center" ? "Centre" : "Bottom"}
        </button>
      ))}
    </div>
  );
}
