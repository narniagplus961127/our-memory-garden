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

test("shared uploads offer exact-file reuse without another transfer and allow an explicit copy", async ({
  page,
}, info) => {
  await login(page);
  const prefix = "Identical " + crypto.randomUUID().slice(0, 8);
  const jpeg = await sharp({
    create: { width: 48, height: 32, channels: 3, background: "#73916b" },
  })
    .jpeg()
    .toBuffer();
  const buffer = Buffer.concat([jpeg, Buffer.from(prefix)]);
  let transfers = 0,
    completions = 0;
  page.on("request", (request) => {
    if (request.method() === "PUT" && new URL(request.url()).port === "59013")
      transfers++;
    if (
      request.method() === "POST" &&
      /\/api\/media\/[^/]+\/complete$/.test(request.url())
    )
      completions++;
  });
  await page.goto("/admin/media", { waitUntil: "domcontentloaded" });
  const input = page.getByLabel("Upload photos", { exact: true });
  await expect(input).toBeEnabled();
  await input.setInputFiles(
    ["a", "b"].map((name) => ({
      name: prefix + name + ".jpg",
      mimeType: "image/jpeg",
      buffer,
    })),
  );
  const panel = page.getByRole("region", {
    name: "Photo uploads",
    exact: true,
  });
  await expect(
    panel.getByRole("button", {
      name: new RegExp("^Use existing photo for " + prefix),
    }),
  ).toBeVisible({ timeout: 30000 });
  expect(transfers).toBe(1);
  expect(completions).toBe(1);
  await page.screenshot({ path: info.outputPath("duplicate-choice.png") });
  await panel
    .getByRole("button", { name: "Reuse all identical photos", exact: true })
    .click();
  await expect(panel).toContainText("2 photos ready");
  expect(transfers).toBe(1);
  expect(completions).toBe(1);
  await input.setInputFiles({
    name: prefix + "copy.jpg",
    mimeType: "image/jpeg",
    buffer,
  });
  await panel
    .getByRole("button", {
      name: "Upload another copy of " + prefix + "copy.jpg",
      exact: true,
    })
    .click();
  await expect(panel).toContainText("1 photo uploaded");
  expect(transfers).toBe(2);
  expect(completions).toBe(2);
});
