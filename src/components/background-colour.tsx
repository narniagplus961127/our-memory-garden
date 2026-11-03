"use client";
import { useEffect, useId, useState } from "react";
const normalColour = (colour: string) =>
  colour.length === 4
    ? "#" + [...colour.slice(1)].map((c) => c + c).join("")
    : colour;

export function BackgroundColour({
  value,
  onChange,
  label = "Background colour",
  defaultLabel = "None",
}: {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  defaultLabel?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const id = useId();
  useEffect(() => {
    // An applied #RGB value must not replace the user's partially typed #RRGGBB.
    setDraft((current) =>
      normalColour(current).toLowerCase() === (value ?? "").toLowerCase()
        ? current
        : (value ?? ""),
    );
  }, [value]);
  const valid = !draft || /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(draft);
  return (
    <div className="background-colour">
      <p className="appearance-label">{label}</p>
      <div className="colour-presets" aria-label={label + " presets"}>
        {[
          ["Paper", "#fffcf5"],
          ["Sage", "#e0e7d9"],
          ["Clay", "#e5c7b7"],
          [defaultLabel, ""],
        ].map(([preset, colour]) => (
          <button
            key={preset}
            type="button"
            title={preset}
            aria-label={
              label === "Background colour"
                ? preset + " background"
                : preset + " · " + label
            }
            aria-pressed={value === colour}
            style={{ backgroundColor: colour || "transparent" }}
            onClick={() => {
              setDraft(colour);
              onChange(colour);
            }}
          />
        ))}
      </div>
      <div className="colour-inputs">
        <input
          type="color"
          aria-label={
            label === "Background colour"
              ? "Choose custom background colour"
              : "Choose " + label.toLowerCase()
          }
          value={value ? normalColour(value) : "#fffcf5"}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(e.target.value);
          }}
        />
        <input
          aria-label={
            label === "Background colour"
              ? "Custom background hex colour"
              : label + " hex"
          }
          placeholder="#A7C4A0"
          value={draft}
          maxLength={7}
          aria-invalid={!valid}
          aria-describedby={id}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            if (!next || /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(next))
              onChange(next ? normalColour(next) : "");
          }}
        />
      </div>
      {!valid && (
        <small id={id} role="status" className="error">
          Enter a hex colour such as #A7C4A0.
        </small>
      )}
    </div>
  );
}
