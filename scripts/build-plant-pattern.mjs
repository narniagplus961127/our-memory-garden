import { readFile, writeFile } from "node:fs/promises";

// Keep all six individual sprites in identical display boxes.
// Embed them because SVGs used as CSS images cannot load external images.
const placements = [
  ["garden-plant-fern-v1.webp", 40, 40],
  ["garden-plant-snake-v1.webp", 286, 150],
  ["garden-plant-monstera-v1.webp", 546, 40],
  ["garden-plant-succulent-v1.webp", 146, 358],
  ["garden-plant-cactus-v1.webp", 400, 438],
  ["garden-plant-orchid-v1.webp", 574, 310],
];
const images = await Promise.all(
  placements.map(async ([name, x, y]) => {
    const bytes = await readFile(
      new URL("../public/brand/" + name, import.meta.url),
    );
    return `<image data-artwork="${name}" x="${x}" y="${y}" width="112" height="112" href="data:image/webp;base64,${bytes.toString("base64")}"/>`;
  }),
);
await writeFile(
  new URL("../public/brand/garden-plants-pattern-v2.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="640" viewBox="0 0 720 640">\n${images.join("\n")}\n</svg>\n`,
);
