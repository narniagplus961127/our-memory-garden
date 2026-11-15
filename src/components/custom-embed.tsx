"use client";

import { useEffect, useId, useRef, useState } from "react";
import { registerOverlayPortal } from "@puckeditor/core";
import { customEmbedCodeLimit, customEmbedDocument } from "@/lib/custom-embed";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export type CustomEmbedProps = {
  embedCode?: string;
  embedTitle?: string;
  embedHeight?: number;
};

export function CustomEmbedCodeField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>HTML, CSS and JavaScript</Label>
      <Textarea
        id={id}
        className="font-mono"
        rows={8}
        value={value ?? ""}
        maxLength={customEmbedCodeLimit}
        placeholder="<div>…</div>"
        autoCapitalize="off"
        spellCheck={false}
        aria-describedby={id + "-help"}
        onChange={(event) =>
          onChange(event.currentTarget.value.replaceAll("\0", ""))
        }
      />
      <small id={id + "-help"} className="muted">
        Include CSS in &lt;style&gt; and JavaScript in &lt;script&gt;. Use
        self-contained code and embedded assets.
      </small>
    </div>
  );
}

export function CustomEmbed({
  embedCode = "",
  embedTitle,
  embedHeight = 320,
  editing,
}: CustomEmbedProps & { editing: boolean }) {
  const [previewCode, setPreviewCode] = useState<string>();
  const interaction = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (editing)
      return registerOverlayPortal(interaction.current, { disableDrag: true });
  }, [editing]);
  const configured = Boolean(embedCode.trim());
  const previewing = configured && (!editing || previewCode === embedCode);
  if (!editing && !configured) return null;

  return (
    <div ref={interaction} className="garden-custom-embed">
      {editing && (
        <div className="garden-embed-controls">
          {configured ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewCode(previewing ? undefined : embedCode)}
            >
              {previewing ? "Hide preview" : "Run preview"}
            </Button>
          ) : (
            <p className="muted">
              Paste your embed code in the block settings.
            </p>
          )}
        </div>
      )}
      {previewing && (
        <iframe
          title={embedTitle?.trim() || "Custom embed"}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={customEmbedDocument(embedCode)}
          loading={editing ? "eager" : "lazy"}
          height={embedHeight}
        />
      )}
    </div>
  );
}
