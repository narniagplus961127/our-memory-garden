import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
test("compose an ordered captioned gallery and use the enlarged viewer with touch and keyboard", async ({
  page,
  isMobile,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const names = ["fern-" + Date.now() + ".png", "rose-" + Date.now() + ".png"];
  const headers = {
    Origin: env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL,
  };
  for (const [i, name] of names.entries()) {
    const bytes = await sharp({
      create: {
        width: 640,
        height: 480,
        channels: 3,
        background: i ? "#c99d83" : "#77956c",
      },
    })
      .png()
      .toBuffer();
    const uploaded = await page.request.post("/api/media/uploads", {
      headers,
      data: { name, size: bytes.length, type: "image/png" },
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
        await page.request.post(`/api/media/${upload.id}/complete`, {
          headers,
          data: {},
        })
      ).ok(),
    ).toBeTruthy();
  }
  const created = await page.request.post("/api/pages", {
    headers,
    data: { title: "Gallery browser " + Date.now() },
  });
  const garden = await created.json();
  await page.goto("/admin/pages/" + garden.id);
  await page.getByRole("button", { name: "Open content panel" }).click();
  await page.getByRole("button", { name: "Add Gallery", exact: true }).click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  for (const name of names) {
    await page
      .getByRole("button", { name: "Add gallery photo", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Use photo " + name, exact: true })
      .click();
  }
  await page
    .getByRole("textbox", { name: "Caption for photo 1", exact: true })
    .fill("Fern in the morning");
  await page
    .getByRole("textbox", { name: "Caption for photo 2", exact: true })
    .fill("Rose at sunset");
  await page
    .getByRole("button", { name: "Move photo 2 up", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Caption for photo 1", exact: true }),
  ).toHaveValue("Rose at sunset");
  await page
    .getByRole("button", { name: "Remove photo 2", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Caption for photo 2", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Add gallery photo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use photo " + names[0], exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Caption for photo 2", exact: true })
    .fill("Fern in the morning");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.reload();
  await expect(
    page.frameLocator("iframe").getByRole("button", {
      name: "Open photo 1: Rose at sunset",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Page visibility", { exact: true })
    .selectOption("public");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const visitor = await browser.newContext({
    viewport: isMobile
      ? { width: 390, height: 844 }
      : { width: 1440, height: 1000 },
    isMobile,
    hasTouch: isMobile,
  });
  const publicPage = await visitor.newPage();
  publicPage.on("pageerror", (e) => errors.push(e.message));
  await publicPage.goto(new URL("/p/" + garden.id, page.url()).href);
  const trigger = publicPage.getByRole("button", {
    name: "Open photo 1: Rose at sunset",
    exact: true,
  });
  const columns = await publicPage
    .locator(".gallery-grid")
    .evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
    );
  expect(columns).toBe(isMobile ? 1 : 3);
  await trigger.click();
  const dialog = publicPage.getByRole("dialog", {
    name: "Gallery photo viewer",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("1 of 2", { exact: true })).toBeVisible();
  await expect(
    dialog.getByText("Rose at sunset", { exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Next photo", exact: true }).click();
  await expect(dialog.getByText("2 of 2", { exact: true })).toBeVisible();
  await expect(
    dialog.getByText("Fern in the morning", { exact: true }),
  ).toBeVisible();
  await publicPage.keyboard.press("ArrowLeft");
  await expect(dialog.getByText("1 of 2", { exact: true })).toBeVisible();
  await publicPage.keyboard.press("ArrowRight");
  await expect(dialog.getByText("2 of 2", { exact: true })).toBeVisible();
  await dialog
    .getByRole("button", { name: "Previous photo", exact: true })
    .click();
  await expect(dialog.getByText("1 of 2", { exact: true })).toBeVisible();
  await publicPage.screenshot({
    path: `work/gallery-${isMobile ? "mobile" : "desktop"}.png`,
  });
  for (const control of await dialog.getByRole("button").all()) {
    const bounds = await control.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(44);
    expect(bounds?.width).toBeGreaterThanOrEqual(44);
  }
  const image = dialog.getByRole("img");
  expect(await image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(
    640,
  );
  expect(
    await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBeTruthy();
  await publicPage.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await publicPage
    .getByRole("button", { name: "Close photo viewer", exact: true })
    .click();
  await expect(trigger).toBeFocused();
  await visitor.close();
  expect(errors).toEqual([]);
});
