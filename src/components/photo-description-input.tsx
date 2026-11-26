"use client";
import { useId } from "react";
import { Label } from "./ui/label";
import { Input } from "./ui/input";

export function PhotoDescriptionInput({
  value = "",
  onChange,
  label = "Alternative text",
  disabled = false,
}: {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="m-0">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={1000}
        disabled={disabled}
        aria-describedby={id + "-help"}
        placeholder="e.g. Walking together beside the sea"
      />
      <p id={id + "-help"} className="muted m-0 text-xs">
        Briefly describe what is visible. Avoid labels like “Photo 1”; a useful
        caption can also describe the photo. This text is read by screen
        readers.
      </p>
    </div>
  );
}
