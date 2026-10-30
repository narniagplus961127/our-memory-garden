"use client";
import { useState } from "react";
import type { usePageAutosave } from "./use-page-autosave";
import type { PageBlock } from "@/lib/blocks";
import { slotNames, slotContent } from "@/lib/blocks";
type Save = ReturnType<typeof usePageAutosave>;
function arrangement(blocks: PageBlock[], depth = 0): string {
  return blocks
    .map(
      (block) =>
        "  ".repeat(depth) +
        block.type +
        ": " +
        String(
          block.props.text ?? block.props.heading ?? block.props.caption ?? "",
        ).slice(0, 500) +
        slotNames(block.type)
          .map(
            (slot) =>
              "\n" +
              "  ".repeat(depth + 1) +
              slot +
              "\n" +
              arrangement(slotContent(block, slot), depth + 2),
          )
          .join(""),
    )
    .join("\n");
}
export function SaveFeedback({ save }: { save: Save }) {
  const [manual, setManual] = useState<Record<string, string>>({}),
    [notice, setNotice] = useState("");
  return (
    <>
      {save.recovered && (
        <p role="status" className="editor-recovery-notice">
          Recovered work is unsaved until it reaches the garden.
        </p>
      )}
      {save.warning && (
        <p role="alert" className="editor-recovery-notice">
          {save.warning}
        </p>
      )}
      {save.copies.map((copy) => (
        <div className="editor-recovery-notice" key={copy.key}>
          <p>
            Another device copy of this page has unsaved work. Review one copy
            at a time; another tab may still be editing it.
          </p>
          <button onClick={() => save.recover(copy.key)}>
            Recover device copy
          </button>{" "}
          <button className="secondary" onClick={() => save.discard(copy.key)}>
            Discard device copy
          </button>
        </div>
      ))}
      {save.comparison && (
        <section
          role="region"
          aria-label="Resolve editing conflicts"
          className="editor-conflicts"
        >
          <h2>Someone else changed this page</h2>
          <p>
            Your work is unsaved. Compare the changes below. The saved version
            is preserved before a replacement.
          </p>
          {save.comparison.result.conflicts.map((conflict) => {
            const text =
              conflict.kind === "block" &&
              (conflict.local as PageBlock)?.type === "Text" &&
              (conflict.saved as PageBlock)?.type === "Text";
            const local = text
              ? String((conflict.local as PageBlock).props.text)
              : conflict.kind === "layout"
                ? arrangement(save.working.content.content)
                : JSON.stringify(conflict.local, null, 2);
            const saved = text
              ? String((conflict.saved as PageBlock).props.text)
              : conflict.kind === "layout"
                ? arrangement(save.comparison!.saved.content.content)
                : JSON.stringify(conflict.saved, null, 2);
            return (
              <fieldset key={conflict.key}>
                <legend>
                  {text
                    ? "Text changed in both editors"
                    : conflict.kind === "layout"
                      ? "Contested layout change"
                      : conflict.label}
                </legend>
                <div className="conflict-comparison">
                  <label>
                    {text ? "Your text" : "Your change"}
                    <textarea
                      aria-label={text ? "Your text" : "Your change"}
                      readOnly
                      value={local}
                      rows={5}
                    />
                  </label>
                  <label>
                    {text ? "Saved text" : "Saved change"}
                    <textarea
                      aria-label={text ? "Saved text" : "Saved change"}
                      readOnly
                      value={saved}
                      rows={5}
                    />
                  </label>
                </div>
                {manual[conflict.key] !== undefined && (
                  <label>
                    Combined text
                    <textarea
                      aria-label="Combined text"
                      value={manual[conflict.key]}
                      onChange={(event) => {
                        setManual({
                          ...manual,
                          [conflict.key]: event.target.value,
                        });
                        save.editConflictText(conflict.key, event.target.value);
                      }}
                      rows={6}
                    />
                  </label>
                )}
                <div className="actions">
                  <button onClick={() => save.resolve(conflict.key, "local")}>
                    {conflict.kind === "layout"
                      ? "Keep my layout"
                      : manual[conflict.key] !== undefined
                        ? "Use combined text"
                        : "Keep mine"}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => save.resolve(conflict.key, "saved")}
                  >
                    {conflict.kind === "layout"
                      ? "Use saved layout"
                      : "Use saved version"}
                  </button>
                  {text ? (
                    <button
                      className="secondary"
                      onClick={async () => {
                        setManual({ ...manual, [conflict.key]: local });
                        try {
                          await navigator.clipboard.writeText(saved);
                          setNotice(
                            "Saved text copied. Compose your text below.",
                          );
                        } catch {
                          setNotice(
                            "Select and copy the saved text above, then compose your text below.",
                          );
                        }
                      }}
                    >
                      Copy and edit manually
                    </button>
                  ) : (
                    <button
                      className="secondary"
                      onClick={() =>
                        setNotice(
                          "Both arrangements are retained. Continue editing the canvas, then choose the layout to keep.",
                        )
                      }
                    >
                      Continue editing
                    </button>
                  )}
                </div>
              </fieldset>
            );
          })}
          {notice && <p role="status">{notice}</p>}
        </section>
      )}
    </>
  );
}
