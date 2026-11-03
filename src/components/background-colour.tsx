"use client";
import { useEffect, useId, useState } from "react";

export function BackgroundColour({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const id = useId();
  useEffect(() => setDraft(value ?? ""), [value]);
  const valid = !draft || /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(draft);
  const normal = (colour: string) =>
    colour.length === 4
      ? "#" + [...colour.slice(1)].map((c) => c + c).join("")
      : colour;
  return (
    <div className="background-colour">
      <div className="colour-presets" aria-label="Garden background colours">
        {[
          ["Paper", "#fffcf5"],
          ["Sage", "#e0e7d9"],
          ["Clay", "#e5c7b7"],
          ["None", ""],
        ].map(([label, colour]) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label + " background"}
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
          aria-label="Choose custom background colour"
          value={value ? normal(value) : "#fffcf5"}
          onChange={(e) => {
            setDraft(e.target.value);
            onChange(e.target.value);
          }}
        />
        <input
          aria-label="Custom background hex colour"
          placeholder="#A7C4A0"
          value={draft}
          maxLength={7}
          aria-invalid={!valid}
          aria-describedby={id}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            if (!next || /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(next))
              onChange(next ? normal(next) : "");
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
