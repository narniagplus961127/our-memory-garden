import { Heart, Star } from "lucide-react";
import type { DividerIcon } from "@/lib/divider";

export function GardenDivider({
  icon = "logo",
  emoji,
}: {
  icon?: DividerIcon;
  emoji?: string;
}) {
  return (
    <div
      className="garden-divider"
      role="separator"
      aria-orientation="horizontal"
    >
      {(icon !== "custom" || emoji) && (
        <span
          className="garden-divider-icon"
          data-icon={icon}
          aria-hidden="true"
        >
          {icon === "logo" && (
            <img src="/brand/seedlings.svg" alt="" width={28} height={28} />
          )}
          {icon === "star" && <Star />}
          {icon === "heart" && <Heart />}
          {icon === "custom" && emoji}
        </span>
      )}
    </div>
  );
}
