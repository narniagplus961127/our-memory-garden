import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
test("unfinished and unsafe web addresses recover as unsaved inactive links", async ({
  page,
}) => {
  const origin = env.NEXT_PUBLIC_APP_URL;
  expect(
    (
      await page.request.post(origin + "/api/auth/sign-in/email", {
        headers: { Origin: origin },
        data: {
          email: env.TEST_ADMIN_EMAIL,
          password: env.TEST_ADMIN_PASSWORD,
        },
      })
    ).status(),
  ).toBe(200);
  const created = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "Unfinished garden links" },
    })
  ).json();
  const path = "/api/pages/" + created.id;
  const setup = await page.request.patch(path, {
    headers: { Origin: origin },
    data: {
      version: created.version,
      content: {
        root: { props: {} },
        content: [
          {
            type: "Button",
            props: {
              id: "unfinished-link",
              label: "Keep reading",
              href: "https://example.com",
              variant: "primary",
              align: "left",
            },
          },
        ],
      },
    },
  });
  expect(setup.status()).toBe(200);
  await page.goto("/admin/pages/" + created.id);
  await page
    .getByRole("button", { name: "Select Button 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  const status = page.getByRole("status", { name: "Auto-save status" });
  await expect(status).toHaveText("Saved");
  await expect(
    page.getByLabel("External web address", { exact: true }),
  ).toHaveValue("https://example.com");
  const acknowledged = await (await page.request.get(path)).json();
  for (const value of [
    "https://",
    "javascript:alert(1)",
    "data:text/html,untrusted",
  ]) {
    await page.getByLabel("External web address", { exact: true }).fill(value);
    await expect(status).toHaveText("Not saved");
    expect((await (await page.request.get(path)).json()).version).toBe(
      acknowledged.version,
    );
    expect(
      await page
        .frameLocator("iframe")
        .locator(".garden-button-block a")
        .getAttribute("href"),
    ).toBeNull();
    await page.reload();
    await expect(
      page.getByText("Recovered work is unsaved until it reaches the garden."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Select Button 1", exact: true })
      .click();
    await page.getByRole("button", { name: "Open settings panel" }).click();
    await expect(
      page.getByLabel("External web address", { exact: true }),
    ).toHaveValue(value);
    await expect(status).toHaveText("Not saved");
    expect(
      await page
        .frameLocator("iframe")
        .locator(".garden-button-block a")
        .getAttribute("href"),
    ).toBeNull();
  }
  await page
    .getByLabel("External web address", { exact: true })
    .fill("https://example.org/our-garden");
  await expect(status).toHaveText("Saved");
  expect(
    await page
      .frameLocator("iframe")
      .locator(".garden-button-block a")
      .getAttribute("href"),
  ).toBe("https://example.org/our-garden");
  const saved = await (await page.request.get(path)).json();
  expect(
    saved.content.content.find((b: { type: string }) => b.type === "Button")
      .props.destination.url,
  ).toBe("https://example.org/our-garden");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("garden-recovery:")),
    ),
  ).toEqual([]);
});
