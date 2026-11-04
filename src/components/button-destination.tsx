"use client";
import { createUsePuck } from "@puckeditor/core";
import type { Destination } from "@/lib/destinations";
import { DestinationPicker } from "./destination-picker";

const useSelectedBlock = createUsePuck();

export function ButtonDestination({
  value,
  onChange,
}: {
  value?: Destination | null;
  onChange: (value: Destination | null) => void;
}) {
  // Read the selected block reactively: Puck memoizes custom field renderers.
  // A null destination is explicit No link; only an absent one uses legacy href.
  const legacyHref = useSelectedBlock(({ selectedItem }) =>
    selectedItem?.type === "Button" &&
    selectedItem.props.destination === undefined &&
    typeof selectedItem.props.href === "string"
      ? selectedItem.props.href
      : undefined,
  );
  return (
    <DestinationPicker
      value={
        value ?? (legacyHref ? { kind: "external", url: legacyHref } : null)
      }
      onChange={onChange}
      optional
    />
  );
}
