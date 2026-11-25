import { readFile, writeFile } from "node:fs/promises";

// Wrap the existing sprites in a spaced tile; no artwork is modified.
// Embed them because SVGs used as CSS images cannot load external images.
const placements = [
  ["garden-pots-v1.webp", 24, 32, 128, 140],
  ["garden-pots-upright-v1.webp", 358, 160, 128, 140],
  ["garden-pots-trailing-v1.webp", 132, 366, 128, 120],
];
const images = await Promise.all(
  placements.map(async ([name, x, y, width, height]) => {
    const bytes = await readFile(
      new URL("../public/brand/" + name, import.meta.url),
    );
    return `<image data-artwork="${name}" x="${x}" y="${y}" width="${width}" height="${height}" href="data:image/webp;base64,${bytes.toString("base64")}"/>`;
  }),
);
await writeFile(
  new URL("../public/brand/garden-plants-pattern-v1.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="560" viewBox="0 0 640 560">\n${images.join("\n")}\n</svg>\n`,
);
