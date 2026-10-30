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
test("upload with per-file feedback, inspect protected details and reuse a photo in Puck", async ({
  page,
  isMobile,
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
  await page.goto("/admin/media");
  await expect(
    page.getByRole("heading", { name: "Media library", exact: true }),
  ).toBeVisible();
  const name = "rosemary-" + Date.now() + ".jpg";
  const buffer = await sharp({
    create: { width: 640, height: 480, channels: 3, background: "#77956c" },
  })
    .jpeg()
    .withExif({ IFD0: { Artist: "Private gardener" } })
    .toBuffer();
  let firstAttempt = true;
  await page.route("**/api/media/uploads", async (route) => {
    if (firstAttempt && route.request().postDataJSON().name === name) {
      firstAttempt = false;
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByLabel("Upload photos", { exact: true }).setInputFiles([
    { name, mimeType: "image/jpeg", buffer },
    {
      name: "broken.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("not an image"),
    },
  ]);
  const queue = page.getByRole("list", { name: "Upload progress" });
  await queue
    .getByRole("button", { name: "Retry " + name, exact: true })
    .click();
  await expect(queue.getByText("Ready", { exact: true })).toBeVisible();
  await expect(queue.getByText(/Use a valid, still JPEG/)).toBeVisible();
  await queue.getByRole("button", { name: "Remove failed broken.jpg" }).click();
  await expect(queue.getByText("broken.jpg")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Photo details " + name, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Photo details", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Private — no public page uses this photo.", {
      exact: true,
    }),
  ).toBeVisible();
  const original = await page.request.get(
    (await page
      .getByRole("link", { name: "Download original" })
      .getAttribute("href")) as string,
  );
  expect(original.status()).toBe(200);
  expect(await original.body()).toEqual(buffer);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Photo details " + name, exact: true }),
  ).toBeFocused();
  const created = await page.request.post("/api/pages", {
    headers: { Origin: env.NEXT_PUBLIC_APP_URL || env.NEXT_PUBLIC_SITE_URL },
    data: { title: "Photo garden " + Date.now(), template: "journal" },
  });
  expect(created.status()).toBe(201);
  const garden = await created.json();
  await page.goto("/admin/pages/" + garden.id);
  await page.getByRole("button", { name: "Open content panel" }).click();
  await page
    .getByRole("button", { name: "Select Image 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  await page
    .getByRole("button", { name: "Use photo " + name, exact: true })
    .click();
  await page
    .getByLabel("Alternative text", { exact: true })
    .fill("Rosemary in the sun");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const image = page
    .frameLocator("iframe")
    .getByRole("img", { name: "Rosemary in the sun", exact: true });
  await expect(image).toBeVisible();
  expect(await image.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(
    640,
  );
  await page.reload();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("img", { name: "Rosemary in the sun", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Page visibility", { exact: true })
    .selectOption("public");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const visitor = await page.context().browser()!.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto(new URL("/p/" + garden.id, page.url()).href);
  await expect(
    publicPage.getByRole("img", { name: "Rosemary in the sun", exact: true }),
  ).toBeVisible();
  expect(
    await publicPage
      .getByRole("img", { name: "Rosemary in the sun", exact: true })
      .evaluate((el: HTMLImageElement) => el.naturalWidth),
  ).toBe(640);
  await visitor.close();
  await page.goto("/admin/media");
  await page
    .getByRole("button", { name: "Photo details " + name, exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: garden.title, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete photo", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: "work/media-" + (isMobile ? "mobile" : "desktop") + ".png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
