"use client";
import { useId } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
export function ButtonRadiusControl({
  value,
  onChange,
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Button corner radius · px</Label>
      <span className="spacing-value">
        <Input
          id={id}
          type="number"
          min={0}
          max={999}
          step={1}
          placeholder="Auto"
          value={value ?? ""}
          onChange={(event) => {
            if (event.target.value === "") return onChange(undefined);
            const radius = Number(event.target.value);
            if (Number.isInteger(radius) && radius >= 0 && radius <= 999)
              onChange(radius);
          }}
        />
        <span className="spacing-unit" aria-hidden="true">
          px
        </span>
      </span>
      <small className="muted">
        0 for square corners; larger values make a pill. Clear to use the
        default.
      </small>
    </div>
  );
}
