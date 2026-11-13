import { test, expect, type Locator } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { selectBlock, setVisibility } from "./editor-controls";

const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => [
      line.slice(0, line.indexOf("=")),
      line.slice(line.indexOf("=") + 1),
    ]),
);
const headers = { Origin: env.NEXT_PUBLIC_APP_URL };

function sectionInsets(grid: Locator) {
  return grid.evaluate((element) => {
    const section = element.closest(".garden-section")!.getBoundingClientRect();
    const grid = element.getBoundingClientRect();
    return [
      Math.round(grid.left - section.left),
      Math.round(section.right - grid.right),
    ];
  });
}

test("add a Photo grid, select photos, reorder and open the website viewer", async ({
  page,
  browser,
  baseURL,
  isMobile,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        headers,
        data: {
          email: env.TEST_ADMIN_EMAIL,
          password: env.TEST_ADMIN_PASSWORD,
        },
      })
    ).status(),
  ).toBe(200);
  const names = ["portrait", "landscape", "square"].map(
    (name) => name + "-" + Date.now() + ".png",
  );
  for (const [index, [width, height]] of [
    [80, 120],
    [150, 70],
    [90, 90],
  ].entries()) {
    const bytes = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: ["#669977", "#a8825f", "#81a2ae"][index],
      },
    })
      .png()
      .toBuffer();
    const uploaded = await page.request.post("/api/media/uploads", {
      headers,
      data: {
        name: names[index],
        type: "image/png",
        size: bytes.length,
      },
    });
    expect(uploaded.status()).toBe(201);
    const upload = await uploaded.json();
    expect(
      (
        await page.request.put(upload.uploadUrl, {
          headers: { "Content-Type": "image/png" },
          data: bytes,
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await page.request.post("/api/media/" + upload.id + "/complete", {
          headers,
          data: {},
        })
      ).ok(),
    ).toBeTruthy();
  }
  const created = await page.request.post("/api/pages", {
    headers,
    data: { title: "Photo grid " + Date.now() },
  });
  expect(created.status()).toBe(201);
  const garden = await created.json();
  await page.goto("/admin/pages/" + garden.id);
  const content = page.getByRole("button", {
    name: "Open content panel",
    exact: true,
  });
  await expect(content).toBeEnabled();
  await content.click();
  const addGrid = page.getByRole("button", {
    name: "Add Photo grid",
    exact: true,
  });
  await expect(addGrid).toBeDisabled();
  await page.getByRole("button", { name: "Add Section", exact: true }).click();
  await addGrid.click();
  const status = page.getByRole("status", { name: "Auto-save status" });
  await expect(status).toHaveText("Saved");
  await selectBlock(page, "Select Photo grid 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  const add = page.getByRole("button", { name: "+ Add photos", exact: true });
  await add.click();
  const chooser = page.getByRole("dialog", { name: "Choose photos" });
  for (const name of names) {
    await chooser.getByRole("searchbox", { name: "Find a photo" }).fill(name);
    await chooser.getByRole("button", { name, exact: true }).click();
  }
  await expect(
    chooser.getByRole("status").filter({ hasText: "3 selected" }),
  ).toBeVisible();
  await chooser
    .getByRole("button", { name: "Add 3 photos", exact: true })
    .click();
  await expect(chooser).toHaveCount(0);
  const rows = page
    .getByRole("list", { name: "Grid photos" })
    .getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await page
    .getByRole("button", { name: "Move " + names[1] + " up", exact: true })
    .click();
  await expect(rows.first()).toContainText(names[1]);
  await page
    .getByRole("button", { name: "Edit " + names[1], exact: true })
    .click();
  const details = page.getByRole("dialog", { name: "Edit photo details" });
  await details
    .getByLabel("Alt text", { exact: true })
    .fill("A landscape photo");
  await details.getByLabel("Caption", { exact: true }).fill("A long afternoon");
  await details
    .getByRole("button", { name: "Save photo details", exact: true })
    .click();
  await expect(details).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Remove " + names[2] + " from grid",
      exact: true,
    })
    .click();
  await expect(rows).toHaveCount(2);
  await page.getByLabel("Gap (px)", { exact: true }).fill("16");
  await expect(status).toHaveText("Saved");
  const canvas = page.frameLocator("iframe");
  const grid = canvas.locator(".garden-photo-grid");
  const section = canvas.locator(".garden-section");
  const insets = isMobile ? [28, 28] : [64, 64];
  await expect.poll(() => sectionInsets(grid)).toEqual(insets);
  const firstTile = grid.locator(".photo-grid-tile").first();
  const normalWidth = (await grid.boundingBox())!.width;
  await selectBlock(page, "Select Section 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  const width = page.getByRole("group", { name: "Section width" });
  await width.getByRole("button", { name: "Full width", exact: true }).click();
  await expect(status).toHaveText("Saved");
  await expect(section).toHaveClass(/garden-section-full/);
  await expect.poll(() => sectionInsets(grid)).toEqual([0, 0]);
  expect((await grid.boundingBox())!.width).toBeGreaterThan(normalWidth);
  await expect
    .poll(() =>
      firstTile.evaluate((tile) => {
        const layout = tile.parentElement!;
        const width = layout.clientWidth;
        const columns = width < 300 ? 1 : width < 640 ? 2 : width < 960 ? 3 : 4;
        const expected = (width - 16 * (columns - 1)) / columns;
        return Math.abs(tile.getBoundingClientRect().width - expected);
      }),
    )
    .toBeLessThan(1);
  await width
    .getByRole("button", { name: "Normal container", exact: true })
    .click();
  await expect(status).toHaveText("Saved");
  await page.screenshot({ path: info.outputPath("photo-grid-editor.png") });
  await setVisibility(page, "public");
  await expect(status).toHaveText("Saved");
  const visitor = await browser.newContext({
    viewport: isMobile
      ? { width: 390, height: 844 }
      : { width: 1360, height: 920 },
    hasTouch: isMobile,
    isMobile,
  });
  try {
    const website = await visitor.newPage();
    website.on("pageerror", (error) => errors.push(error.message));
    await website.goto(baseURL + "/p/" + garden.id);
    const open = website.getByRole("button", {
      name: "Open A landscape photo",
      exact: true,
    });
    await expect(open).toBeVisible();
    const publicGrid = website.locator(".garden-photo-grid");
    await expect.poll(() => sectionInsets(publicGrid)).toEqual(insets);
    const landscape = await open.locator("img").boundingBox();
    const portrait = await website
      .getByRole("button", { name: "Open Photo 2", exact: true })
      .locator("img")
      .boundingBox();
    expect(landscape!.height).toBeLessThan(portrait!.height);
    expect(landscape!.width).toBeCloseTo(portrait!.width, 0);
    await open.click();
    const viewer = website.getByRole("dialog", { name: "Photo grid viewer" });
    await expect(
      viewer.getByRole("heading", { name: "A long afternoon" }),
    ).toBeVisible();
    await viewer.getByRole("button", { name: "Next →", exact: true }).click();
    await expect(
      viewer.getByRole("img", { name: "Photo 2", exact: true }),
    ).toBeVisible();
    await website.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await expect(open).toBeFocused();
    await website.screenshot({
      path: info.outputPath("photo-grid-website.png"),
    });
    await selectBlock(page, "Select Section 1");
    await page
      .getByRole("button", { name: "Open settings panel", exact: true })
      .click();
    await width
      .getByRole("button", { name: "Full width", exact: true })
      .click();
    await expect(status).toHaveText("Saved");
    await website.reload();
    await expect.poll(() => sectionInsets(publicGrid)).toEqual([0, 0]);
    expect(errors).toEqual([]);
  } finally {
    await visitor.close();
  }
});
