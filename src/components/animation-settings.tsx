"use client";
import { useId } from "react";
import { Label } from "./ui/label";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
export function AnimationSettings({
  value,
  onChange,
}: {
  value?: "none" | "fade-in";
  onChange: (value: "none" | "fade-in") => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Animation type</Label>
      <NativeSelect
        id={id}
        value={value ?? "fade-in"}
        onChange={(event) =>
          onChange(event.target.value === "none" ? "none" : "fade-in")
        }
      >
        <NativeSelectOption value="fade-in">Fade in</NativeSelectOption>
        <NativeSelectOption value="none">None</NativeSelectOption>
      </NativeSelect>
      <small className="muted">
        Fade in gently from above when this content enters view. Animations are
        paused in the editor.
      </small>
    </div>
  );
}
