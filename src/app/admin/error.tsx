"use client";
import { GardenErrorState } from "@/components/garden-error-state";
export default function AdminError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return <GardenErrorState retry={retry} admin />;
}
