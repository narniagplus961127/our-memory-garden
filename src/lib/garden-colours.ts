import type { CSSProperties } from "react";

// Shared by the site, editor iframe and saved-colour preset controls.
export const gardenColours = {
  page: "#faf8f1",
  surface: "#ffffff",
  panel: "#fffaf0",
  parchment: "#fff3d8",
  forest: "#355641",
  text: "#2d4032",
  mutedText: "#596b59",
  sage: "#e5eddf",
  border: "#cdd8c5",
  input: "#7c8f73",
  focus: "#5b7b4b",
  shadow: "#c9d6c1",
  destructive: "#a74435",
  errorText: "#8d3a2d",
  errorFill: "#f8eae5",
  clay: "#e5c7b7",
} as const;

export const gardenColourVariables = Object.fromEntries(
  Object.entries(gardenColours).map(([role, colour]) => [
    "--garden-" +
      role.replace(/[A-Z]/g, (letter) => "-" + letter.toLowerCase()),
    colour,
  ]),
) as CSSProperties & Record<`--garden-${string}`, string>;

// Puck copies stylesheets into a separate document; root inline styles are not copied.
export const gardenColourCss =
  ":root{" +
  Object.entries(gardenColourVariables)
    .map(([property, colour]) => `${property}:${colour}`)
    .join(";") +
  "}";
