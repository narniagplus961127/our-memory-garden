import { selectBlock, setVisibility } from "./editor-controls";
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
test("a removed editor image becomes deletable while its page and history remain", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const headers = { Origin: env.NEXT_PUBLIC_APP_URL };
  await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  const bytes = await sharp({
      create: { width: 32, height: 24, channels: 3, background: "#769270" },
    })
      .png()
      .toBuffer(),
    name = "unused-after-edit-" + Date.now() + ".png";
  const upload = await (
    await page.request.post("/api/media/uploads", {
      headers,
      data: { name, size: bytes.length, type: "image/png" },
    })
  ).json();
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
  const garden = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Keep this page after removing its photo " + Date.now() },
    })
  ).json();
  expect(
    (
      await page.request.patch("/api/pages/" + garden.id, {
        headers,
        data: {
          version: garden.version,
          content: {
            root: { props: {} },
            content: [
              {
                type: "Section",
                props: {
                  id: "photo-section",
                  content: [
                    {
                      type: "Image",
                      props: {
                        id: "photo-to-remove",
                        photoId: upload.id,
                        alt: "Local test flower",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/admin/pages/" + garden.id);
  await selectBlock(page, "Select Image 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove block", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Remove Image?", exact: true })
    .getByRole("button", { name: "Remove block", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/media/" + upload.id)).json())
          .usages,
    )
    .toEqual([]);
  await page.goto("/admin/media");
  await page
    .getByRole("button", { name: "Photo details " + name, exact: true })
    .click();
  const details = page.getByRole("dialog", {
    name: "Photo details",
    exact: true,
  });
  await expect(
    details
      .getByRole("button", { name: "Close photo details", exact: true })
      .locator("svg"),
  ).toHaveCount(1);
  await expect(
    details.getByRole("button", { name: "Delete photo", exact: true }),
  ).toBeEnabled();
  await details
    .getByRole("button", { name: "Delete photo", exact: true })
    .click();
  await expect(details).toContainText(
    "including access from saved page versions",
  );
  await page.screenshot({
    path: testInfo.outputPath("unused-photo-modal.png"),
  });
  await details
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(details).toHaveCount(0);
  expect((await page.request.get("/api/media/" + upload.id)).status()).toBe(
    404,
  );
  expect((await page.request.get("/api/pages/" + garden.id)).status()).toBe(
    200,
  );
  const history = await page.request.get(
    "/api/pages/" + garden.id + "/history",
  );
  expect(history.ok()).toBeTruthy();
  await page.goto("/admin/pages/" + garden.id + "/history?version=2");
  await expect(
    page.getByRole("img", {
      name: "Local test flower — no longer available",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Photo no longer available", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("deleted-historical-photo.png"),
  });
});

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
  await selectBlock(page, "Select Image 1");
  await page.getByRole("button", { name: "Open settings panel" }).click();
  const choosePhoto = page.getByRole("button", {
    name: "Choose photo",
    exact: true,
  });
  await choosePhoto.click();
  const chooser = page.getByRole("dialog", {
    name: "Choose a photo",
    exact: true,
  });
  await expect(chooser.locator(".media-grid")).toHaveCSS(
    "grid-template-columns",
    /px .+px/,
  );
  await expect(chooser.getByRole("img", { name, exact: true })).toHaveCSS(
    "height",
    "112px",
  );
  await chooser
    .getByRole("button", { name: "Use photo " + name, exact: true })
    .click();
  await expect(chooser).not.toBeVisible();
  await expect(choosePhoto).toBeFocused();
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
  await expect
    .poll(() => image.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBe(640);
  await page.reload();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("img", { name: "Rosemary in the sun", exact: true }),
  ).toBeVisible();
  await setVisibility(page, "public");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const visitor = await page.context().browser()!.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto(new URL("/p/" + garden.id, page.url()).href);
  await expect(
    publicPage.getByRole("img", { name: "Rosemary in the sun", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      publicPage
        .getByRole("img", { name: "Rosemary in the sun", exact: true })
        .evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBe(640);
  await visitor.close();
  await page.goto("/admin/media");
  await page
    .getByRole("button", { name: "Photo details " + name, exact: true })
    .click();
  const photoDetails = page.getByRole("dialog", {
    name: "Photo details",
    exact: true,
  });
  const overview = photoDetails.getByRole("tab", {
    name: "Overview",
    exact: true,
  });
  const usage = photoDetails.getByRole("tab", { name: "Usage", exact: true });
  const linkedPage = photoDetails.getByRole("link", {
    name: garden.title,
    exact: true,
  });
  await expect(overview).toHaveAttribute("aria-selected", "true");
  await expect(linkedPage).not.toBeVisible();
  if (isMobile) await usage.click();
  else {
    await overview.focus();
    await overview.press("ArrowRight");
  }
  await expect(usage).toHaveAttribute("aria-selected", "true");
  await expect(linkedPage).toBeVisible();
  await expect(
    photoDetails.getByRole("img", { name, exact: true }),
  ).not.toBeVisible();
  await overview.click();
  await expect(
    page.getByRole("button", { name: "Delete photo", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: "work/media-" + (isMobile ? "mobile" : "desktop") + ".png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
