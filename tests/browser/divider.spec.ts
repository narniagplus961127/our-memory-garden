import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { selectBlock } from "./editor-controls";

const env = parseEnv(readFileSync(".env.test", "utf8"));
const headers = {
  Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
};

test("the Divider supports presets and saves a custom emoji through page JSON", async ({
  page,
  browser,
  baseURL,
}) => {
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
  async function createPage(title: string) {
    const response = await page.request.post("/api/pages", {
      headers,
      data: { title: title + " " + crypto.randomUUID().slice(0, 8) },
    });
    expect(response.status()).toBe(201);
    return response.json();
  }

  const source = await createPage("Divider settings");
  await page.goto("/admin/pages/" + source.id);
  const palette = page.getByRole("button", {
    name: "Open content panel",
    exact: true,
  });
  await palette.click();
  const add = page.getByRole("button", { name: "Add Divider", exact: true });
  await expect(add).toBeDisabled();
  await page.getByRole("button", { name: "Add Section", exact: true }).click();
  await palette.click();
  await add.click();
  const canvas = page.frameLocator("iframe");
  const separator = canvas.locator('.garden-divider[role="separator"]');
  const icon = separator.locator(".garden-divider-icon");
  await expect(icon).toHaveAttribute("data-icon", "logo");
  await expect(icon.locator("img")).toHaveAttribute(
    "src",
    "/brand/seedlings.svg",
  );

  await selectBlock(page, "Select Divider 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  const choice = page.getByLabel("Icon", { exact: true });
  const input = page.getByRole("textbox", {
    name: "Custom emoji",
    exact: true,
  });
  await expect(input).toHaveCount(0);
  for (const preset of ["star", "heart"]) {
    await choice.selectOption(preset);
    await expect(icon).toHaveAttribute("data-icon", preset);
  }

  await choice.selectOption("custom");
  await expect(input).toBeVisible();
  await expect(icon).toHaveCount(0);
  const emoji = "👩‍❤️‍👩";
  await input.fill(emoji);
  await expect(icon).toHaveText(emoji);
  await choice.selectOption("heart");
  await expect(input).toHaveCount(0);
  await choice.selectOption("custom");
  await expect(input).toHaveValue(emoji);
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const exported = await (
    await page.request.get("/api/pages/" + source.id + "/json")
  ).json();
  expect(exported.page.blocks[0].blocks[0]).toMatchObject({
    type: "Divider",
    settings: { dividerIcon: "custom", dividerEmoji: emoji },
  });

  const target = await createPage("Imported divider");
  const importResponse = await page.request.post(
    "/api/pages/" + target.id + "/json",
    {
      headers,
      data: { file: exported, confirm: true },
    },
  );
  expect(importResponse.ok()).toBeTruthy();
  const saved = await (
    await page.request.get("/api/pages/" + target.id)
  ).json();
  expect(
    (
      await page.request.patch("/api/pages/" + target.id, {
        headers,
        data: { visibility: "public", version: saved.version },
      })
    ).ok(),
  ).toBeTruthy();

  const visitor = await browser.newContext({ viewport: page.viewportSize()! });
  try {
    const view = await visitor.newPage();
    await view.goto(baseURL + "/p/" + target.id);
    const divider = view.locator('.garden-divider[role="separator"]');
    const symbol = divider.locator(".garden-divider-icon");
    await expect(symbol).toHaveText(emoji);
    const footer = view.getByRole("contentinfo");
    await expect(footer).toHaveText("Our Memory Garden");
    await expect(footer).toHaveCSS("text-align", "center");
    await expect(footer).toHaveCSS("background-color", "rgb(48, 67, 55)");
    await expect(footer).toHaveCSS("color", "rgb(255, 255, 255)");
    const [line, middle] = await Promise.all([
      divider.boundingBox(),
      symbol.boundingBox(),
    ]);
    expect(line!.width).toBeGreaterThan(middle!.width);
    expect(line!.x + line!.width / 2).toBeCloseTo(
      middle!.x + middle!.width / 2,
      0,
    );
  } finally {
    await visitor.close();
  }
});
