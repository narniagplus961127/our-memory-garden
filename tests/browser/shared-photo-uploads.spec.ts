import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import sharp from "sharp";
const env = parseEnv(readFileSync(".env.test", "utf8"));
const headers = {
  Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
};
async function login(page: Page) {
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        headers,
        data: {
          email: env.TEST_ADMIN_EMAIL,
          password: env.TEST_ADMIN_PASSWORD,
        },
      })
    ).ok(),
  ).toBeTruthy();
}
async function navigate(page: Page, name: string, mobile: boolean) {
  if (mobile) {
    await page.getByLabel("Open administration menu").click();
    await page
      .getByRole("navigation", { name: "Mobile administration", exact: true })
      .getByRole("link", { name, exact: true })
      .click();
  } else
    await page
      .getByRole("navigation", { name: "Administration", exact: true })
      .getByRole("link", { name, exact: true })
      .click();
}

test("uploads keep two shared slots across navigation and editor pickers and warn before leaving", async ({
  page,
  isMobile,
}, testInfo) => {
  test.setTimeout(150000);
  await login(page);
  const prefix = "Shared upload " + crypto.randomUUID().slice(0, 8);
  const buffer = await sharp({
    create: { width: 320, height: 240, channels: 3, background: "#769270" },
  })
    .jpeg()
    .toBuffer();
  const initializations: string[] = [];
  const entry = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: prefix + " page" },
    })
  ).json();
  let release!: () => void;
  const processing = new Promise<void>((done) => {
    release = done;
  });
  page.once("close", release);
  await page.route("**/api/media/uploads", async (route) => {
    initializations.push(route.request().postDataJSON().name);
    await route.continue();
  });
  await page.route("**/api/media/*/complete", async (route) => {
    await processing;
    await route.continue().catch(() => {});
  });
  await page.goto("/admin/media");
  await page.getByLabel("Upload photos", { exact: true }).setInputFiles(
    [1, 2, 3].map((i) => ({
      name: prefix + i + ".jpg",
      mimeType: "image/jpeg",
      buffer,
    })),
  );
  await expect.poll(() => initializations.length).toBe(2);
  const panel = page.getByRole("region", {
    name: "Photo uploads",
    exact: true,
  });
  await expect(panel.getByText("Processing", { exact: true })).toHaveCount(2);
  await page.evaluate(() => {
    document.documentElement.dataset.uploadDocument = "preserved";
  });
  await panel.getByRole("button", { name: "Minimize upload panel" }).click();
  await navigate(page, "Pages", isMobile);
  await expect(page.locator("html")).toHaveAttribute(
    "data-upload-document",
    "preserved",
  );
  expect(
    await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(true);
  if (isMobile) await page.getByLabel("Open administration menu").click();
  const signOutTrigger = page.getByRole("button", {
    name: "Sign out",
    exact: true,
  });
  if (isMobile) await signOutTrigger.click();
  else {
    await signOutTrigger.focus();
    await signOutTrigger.press("Enter");
  }
  const signOut = page.getByRole("dialog", {
    name: "Stop uploads and sign out?",
    exact: true,
  });
  await expect(signOut).toBeVisible();
  await signOut.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(panel).toContainText("0 of 3 uploaded");
  if (
    isMobile &&
    (await page.locator(".admin-mobile-bar details[open]").count()) === 0
  )
    await page.getByLabel("Open administration menu").click();
  await page.getByRole("link", { name: "View website ↗", exact: true }).click();
  await expect(panel).toContainText("0 of 3 uploaded");
  await page.evaluate(() => {
    const link = document.createElement("a");
    link.href = "/admin/pages";
    link.id = "upload-plain-return";
    link.textContent = "Return to pages";
    link.style.cssText =
      "position:fixed;top:120px;right:16px;z-index:1000;background:white;padding:12px";
    document.body.append(link);
  });
  await page.locator("#upload-plain-return").click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  await expect(page.locator("html")).toHaveAttribute(
    "data-upload-document",
    "preserved",
  );
  await page.evaluate(() =>
    document.getElementById("upload-plain-return")?.remove(),
  );
  await page
    .getByRole("link", { name: "Edit " + entry.title, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  const picker = page.getByRole("dialog", {
    name: "Choose a photo",
    exact: true,
  });
  await picker
    .getByLabel("Upload photos", { exact: true })
    .setInputFiles({ name: prefix + "4.jpg", mimeType: "image/jpeg", buffer });
  await picker
    .getByRole("button", { name: "View upload progress", exact: true })
    .click();
  const activity = page.getByRole("dialog", {
    name: "Photo uploads",
    exact: true,
  });
  await expect(activity).toContainText("0 of 4 uploaded");
  await activity.getByRole("button", { name: "Close", exact: true }).click();
  await picker
    .getByRole("button", { name: "Close photo library", exact: true })
    .click();
  expect(initializations).toHaveLength(2);
  await page.locator('a[href="/admin/pages"]').first().click();
  await navigate(page, "Media library", isMobile);
  release();
  await expect(panel).toContainText("4 photos uploaded");
  expect(initializations).toHaveLength(4);
  await page
    .getByRole("searchbox", { name: "Find a photo", exact: true })
    .fill(prefix);
  await expect(page.locator(".media-card")).toHaveCount(4);
  expect(
    await page.evaluate(() => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(false);
  await page.screenshot({
    path: testInfo.outputPath("completed-upload-panel.png"),
    fullPage: true,
  });
});

test("confirming sign out stops queued uploads without a second unload prompt", async ({
  page,
  isMobile,
}) => {
  await login(page);
  let started = 0;
  let release!: () => void;
  const held = new Promise<void>((done) => {
    release = done;
  });
  page.once("close", release);
  await page.route("**/api/media/uploads", async (route) => {
    started++;
    await held;
    await route.abort().catch(() => {});
  });
  await page.goto("/admin/media");
  await page.getByLabel("Upload photos", { exact: true }).setInputFiles(
    [1, 2, 3].map((i) => ({
      name: "Sign out " + i + ".jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("pending upload"),
    })),
  );
  await expect.poll(() => started).toBe(2);
  await page.getByRole("button", { name: "Minimize upload panel" }).click();
  if (isMobile) await page.getByLabel("Open administration menu").click();
  const signOutTrigger = page.getByRole("button", {
    name: "Sign out",
    exact: true,
  });
  if (isMobile) await signOutTrigger.click();
  else {
    await signOutTrigger.focus();
    await signOutTrigger.press("Enter");
  }
  let prompts = 0;
  page.on("dialog", async (dialog) => {
    prompts++;
    await dialog.dismiss();
  });
  await page
    .getByRole("dialog", { name: "Stop uploads and sign out?" })
    .getByRole("button", { name: "Stop uploads and sign out", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  expect(prompts).toBe(0);
  expect(started).toBe(2);
  release();
});
