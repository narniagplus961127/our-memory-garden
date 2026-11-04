"use client";
import { Modal } from "./modal";
import { Button } from "@/components/ui/button";
import { useState } from "react";
export const columnRatios = [
  { value: "equal", label: "Equal", weights: [1, 1] },
  { value: "wide-right", label: "33% / 67%", weights: [1, 2] },
  { value: "wide-left", label: "67% / 33%", weights: [2, 1] },
  { value: "quarter-left", label: "25% / 75%", weights: [1, 3] },
  { value: "quarter-right", label: "75% / 25%", weights: [3, 1] },
] as const;
export type ColumnRatio = (typeof columnRatios)[number]["value"];
export function ColumnLayoutPicker({
  count = 2,
  ratio = "equal",
  onApply,
  onClose,
}: {
  count?: number;
  ratio?: ColumnRatio;
  onApply: (count: number, ratio: ColumnRatio) => void;
  onClose: () => void;
}) {
  const [nextCount, setCount] = useState(count),
    [nextRatio, setRatio] = useState<ColumnRatio>(ratio);
  return (
    <Modal
      closeLabel="Close column chooser"
      title="Choose your columns"
      label="Choose your columns"
      onClose={onClose}
      className="column-layout-dialog"
    >
      <p>Number of columns</p>
      <div className="column-counts">
        {[1, 2, 3, 4].map((n) => (
          <Button
            key={n}
            aria-label={n + (n === 1 ? " column" : " columns")}
            aria-pressed={nextCount === n}
            onClick={() => {
              setCount(n);
              if (n !== 2) setRatio("equal");
            }}
          >
            {n}
          </Button>
        ))}
      </div>
      <p>Column proportions</p>
      <div className="column-options">
        {(nextCount === 2 ? columnRatios : [columnRatios[0]]).map((option) => (
          <Button
            key={option.value}
            aria-pressed={nextRatio === option.value}
            onClick={() => setRatio(option.value)}
          >
            <span
              className="column-diagram"
              style={{
                gridTemplateColumns: (nextCount === 2
                  ? option.weights
                  : Array.from({ length: nextCount }, () => 1)
                )
                  .map((n) => n + "fr")
                  .join(" "),
              }}
              aria-hidden="true"
            >
              {Array.from({ length: nextCount }, (_, i) => (
                <i key={i} />
              ))}
            </span>
            {option.label}
          </Button>
        ))}
      </div>
      <p className="muted" role="status">
        {nextCount < count
          ? "Contents of removed columns move into the final remaining column, in reading order. Every block is kept."
          : "Columns stack in reading order on mobile."}
      </p>
      <div className="actions">
        <Button className="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={() => onApply(nextCount, nextRatio)}>
          Apply layout
        </Button>
      </div>
    </Modal>
  );
}
