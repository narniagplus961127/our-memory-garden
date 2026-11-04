import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// The vector is the source of truth for header, downloadable PNG and app icons.
const mark = await readFile(
  new URL("../public/brand/seedlings.svg", import.meta.url),
  "utf8",
);
const icon = mark.replace(
  /<svg\b[^>]*>/,
  '$&<rect width="64" height="64" rx="14" fill="#fffcf5"/>',
);
await writeFile(new URL("../src/app/icon.svg", import.meta.url), icon);
await sharp(Buffer.from(mark))
  .resize(512, 512)
  .png()
  .toFile(
    fileURLToPath(new URL("../public/brand/seedlings.png", import.meta.url)),
  );
await sharp(Buffer.from(icon))
  .resize(180, 180)
  .flatten({ background: "#fffcf5" })
  .png()
  .toFile(fileURLToPath(new URL("../src/app/apple-icon.png", import.meta.url)));

// PNG-compressed ICO entries provide explicit 16/32/48 px fallbacks.
const sizes = [16, 32, 48];
const images = await Promise.all(
  sizes.map((size) =>
    sharp(Buffer.from(icon)).resize(size, size).png().toBuffer(),
  ),
);
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
for (const [index, size] of sizes.entries()) {
  const entry = 6 + index * 16;
  directory[entry] = size;
  directory[entry + 1] = size;
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(images[index].length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
}
await writeFile(
  new URL("../src/app/favicon.ico", import.meta.url),
  Buffer.concat([directory, ...images]),
);
console.log(
  "Built seedling SVG, 512 px PNG, touch icon and 16/32/48 px favicon.",
);
