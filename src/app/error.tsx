"use client";
import { GardenErrorState } from "@/components/garden-error-state";
import { usePathname } from "next/navigation";
export default function GardenError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const pathname = usePathname();
  return (
    <GardenErrorState retry={retry} admin={pathname.startsWith("/admin")} />
  );
}
