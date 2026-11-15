"use client";
import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function BlockNumberInput({
  id,
  label,
  placeholder,
  min,
  max,
  value,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  min: number;
  max: number;
  value?: number;
  onChange: (value: number | undefined) => void;
}) {
  const [draft, setDraft] = useState(value?.toString() ?? "");
  useEffect(() => setDraft(value?.toString() ?? ""), [id, value]);
  const number = Number(draft);
  const invalid =
    Boolean(draft) &&
    (!Number.isInteger(number) || number < min || number > max);

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={1}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={() => {
          if (invalid) setDraft(value?.toString() ?? "");
          else onChange(draft === "" ? undefined : number);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </div>
  );
}
