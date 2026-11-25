import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = process.argv[2];
if (!source)
  throw Error("Pass the generated transparent 3 × 2 plant atlas PNG.");
const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
if (info.width % 3 || info.height % 2)
  throw Error("The atlas must have three equal columns and two equal rows.");
const cellWidth = info.width / 3;
const cellHeight = info.height / 2;
const names = ["fern", "snake", "monstera", "succulent", "cactus", "orchid"];
const folder = new URL("../public/brand/", import.meta.url);
await mkdir(folder, { recursive: true });
for (const [index, name] of names.entries()) {
  const originX = (index % 3) * cellWidth;
  const originY = Math.floor(index / 3) * cellHeight;
  let minX = cellWidth;
  let minY = cellHeight;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < cellHeight; y++) {
    for (let x = 0; x < cellWidth; x++) {
      // Ignore nearly invisible alpha noise when measuring the visible sprite.
      if (data[((originY + y) * info.width + originX + x) * 4 + 3] > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (
    maxX < 0 ||
    minX < 8 ||
    minY < 8 ||
    maxX >= cellWidth - 8 ||
    maxY >= cellHeight - 8
  )
    throw Error(
      name + " needs a complete sprite with clear transparent gutters.",
    );
  const sprite = await sharp(source)
    .extract({
      left: originX + minX,
      top: originY + minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    })
    .resize({ height: 192, kernel: "nearest" })
    .png()
    .toBuffer();
  const { width } = await sharp(sprite).metadata();
  if (!width || width > 224)
    throw Error(name + " cannot fit the common canvas at the common height.");
  const left = Math.floor((224 - width) / 2);
  await sharp(sprite)
    .extend({
      top: 16,
      bottom: 16,
      left,
      right: 224 - width - left,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 82, alphaQuality: 100, effort: 6 })
    .toFile(fileURLToPath(new URL(`garden-plant-${name}-v1.webp`, folder)));
}
