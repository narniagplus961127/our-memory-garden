import { writeFile } from "node:fs/promises";

// Original decorative artwork on a whole-pixel grid. No runtime drawing code.
const palette = {
  grass: "#b9d978",
  light: "#d4eaa2",
  leaf: "#72a34d",
  shade: "#477344",
  deep: "#304f39",
  water: "#67c3bb",
  ripple: "#b0e7cc",
  sand: "#ecd39d",
  path: "#f5e4b5",
  wood: "#b17b48",
  edge: "#795b38",
  pink: "#dd8ba3",
};
const rect = (x, y, w, h, fill) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
const flower = (x, y, colour = palette.pink) =>
  `<g transform="translate(${x} ${y})">` +
  rect(4, 8, 4, 12, palette.shade) +
  rect(0, 12, 4, 4, palette.leaf) +
  `<path fill="${colour}" d="M4 0h4v4h4v4h-4v4H4V8H0V4h4z"/>` +
  rect(4, 4, 4, 4, "#fff4c6") +
  "</g>";
const tree = (x, y) =>
  `<g transform="translate(${x} ${y})">` +
  rect(20, 44, 12, 28, palette.edge) +
  `<path fill="${palette.shade}" d="M12 8h32v8h8v36h-8v8H8v-8H0V24h8V12h4z"/>` +
  `<path fill="${palette.leaf}" d="M12 0h24v8h12v24h-8v12H8V32H0V16h12z"/>` +
  rect(12, 8, 16, 8, "#a3cb68") +
  rect(8, 16, 8, 8, "#a3cb68") +
  "</g>";
let scene = rect(0, 0, 640, 192, palette.light);
scene += `<path fill="${palette.grass}" d="M0 40h80V28h88v16h96V24h144v16h96V20h136v172H0z"/>`;
scene += `<path fill="${palette.water}" d="M280 0h52v44h-12v52h16v96h-56v-76h-12V56h12z"/>`;
for (const [x, y] of [
  [288, 12],
  [308, 40],
  [280, 68],
  [300, 88],
  [312, 156],
  [284, 176],
])
  scene += rect(x, y, 12, 4, palette.ripple);
scene += `<path fill="${palette.sand}" d="M0 112h156V96h120v8h64V92h108v12h96v-8h96v48H532v12H420v-12H320v4h-56v-8H144v12H0z"/>`;
scene += `<path fill="${palette.path}" d="M0 120h156v-16h112v12h80v-16h92v12h112v-8h88v32H528v12H428v-12H312v4h-40v-8H152v12H0z"/>`;
for (const [x, y] of [
  [24, 124],
  [132, 132],
  [196, 112],
  [368, 120],
  [452, 124],
  [588, 116],
])
  scene += rect(x, y, 8, 4, "#dfbf83");
scene +=
  rect(260, 100, 92, 44, palette.edge) + rect(260, 100, 92, 36, palette.wood);
for (let y = 104; y < 136; y += 8) scene += rect(264, y, 84, 4, "#d6aa65");
scene +=
  rect(256, 92, 8, 56, palette.deep) + rect(348, 92, 8, 56, palette.deep);
scene +=
  tree(12, 4) +
  tree(104, -16) +
  tree(552, -8) +
  tree(588, 132) +
  tree(188, 140);
for (const [x, y] of [
  [76, 64],
  [108, 72],
  [140, 56],
  [372, 32],
  [400, 40],
  [436, 24],
  [468, 44],
  [500, 28],
  [356, 156],
  [388, 164],
  [420, 152],
  [460, 160],
  [524, 164],
  [36, 166],
  [76, 156],
])
  scene += flower(x, y);
scene +=
  rect(468, 76, 44, 8, palette.edge) +
  rect(468, 64, 44, 12, palette.wood) +
  rect(472, 84, 4, 12, palette.deep) +
  rect(504, 84, 4, 12, palette.deep);
for (const [x, y] of [
  [164, 28],
  [236, 60],
  [536, 60],
  [96, 176],
  [552, 180],
])
  scene +=
    `<path fill="${palette.leaf}" d="M${x} ${y}v-8h4v8h4v-4h4v8H0z"/>`.replace(
      "H0z",
      `H${x}z`,
    );
await writeFile(
  new URL("../public/brand/pixel-garden.svg", import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 192" shape-rendering="crispEdges">${scene}</svg>\n`,
);
console.log("Built original pixel garden artwork.");
