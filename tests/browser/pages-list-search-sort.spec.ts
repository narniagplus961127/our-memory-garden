import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

const env = parseEnv(readFileSync(".env.test", "utf8"));
const headers = {
  Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
};

test("search and sort Pages without changing the saved drag order", async ({
  page,
}) => {
  const signedIn = await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  expect(signedIn.ok()).toBeTruthy();
  const key = crypto.randomUUID().slice(0, 8);

  async function create(name: string, date: string | null) {
    const title = key + " " + name;
    const response = await page.request.post("/api/pages", {
      headers,
      data: { title, slug: "find-" + key + "-" + name.toLowerCase() },
    });
    expect(response.status()).toBe(201);
    const entry = await response.json();
    if (date) {
      const updated = await page.request.patch(
        "/api/pages/" + entry.id + "/details",
        {
          headers,
          data: {
            date,
            metadataVersion: entry.metadata_version,
            coverPhotoId: null,
          },
        },
      );
      expect(updated.status()).toBe(200);
    }
    return title;
  }

  const b = await create("Bravo", null);
  const a = await create("Alpha", "2025-05-12");
  const z = await create("Zulu", "2024-09-09");

  // Give the first-created page the most recent update.
  const first = (await (await page.request.get("/api/pages")).json()).find(
    (entry: { title: string }) => entry.title === b,
  );
  expect(first).toBeTruthy();
  expect(
    (
      await page.request.patch("/api/pages/" + first.id, {
        headers,
        data: { version: first.version, visibility: "public" },
      })
    ).ok(),
  ).toBeTruthy();

  await page.goto("/admin/pages");
  await page
    .getByRole("button", { name: "Actions for " + b, exact: true })
    .click();
  const view = page.getByRole("menuitem", { name: "View", exact: true });
  await expect(view).toHaveAttribute("href", "/p/" + first.id);
  const opened = page.waitForEvent("popup");
  await view.click();
  const website = await opened;
  await expect(website).toHaveURL(new RegExp("/garden/find-"));
  await website.close();
  const search = page.getByRole("searchbox", { name: "Search pages" });
  const sort = page.getByRole("combobox", { name: "Sort by" });
  const rows = page.locator(".admin-page-cards li strong");
  const grip = page.getByRole("button", { name: "Drag " + z, exact: true });
  await expect(sort).toHaveValue("page-date-desc");
  await search.fill(key);
  await expect(rows).toHaveText([a, z, b]);
  await search.clear();
  await sort.selectOption("manual");
  await expect(grip).toBeVisible();
  const original = (await rows.allTextContents()).filter((title) =>
    title.startsWith(key),
  );

  await search.fill(key.toUpperCase());
  await expect(rows).toHaveText(original);
  await expect(grip).toHaveCount(0);

  for (const [value, expected] of [
    ["title-asc", [a, b, z]],
    ["title-desc", [z, b, a]],
    ["created-asc", [b, a, z]],
    ["created-desc", [z, a, b]],
    ["page-date-asc", [z, a, b]],
    ["page-date-desc", [a, z, b]],
    ["updated-desc", [b, z, a]],
    ["updated-asc", [a, z, b]],
  ] as const) {
    await sort.selectOption(value);
    await expect(rows).toHaveText([...expected]);
  }
  await search.fill("/garden/find-" + key + "-alpha");
  await expect(rows).toHaveText([a]);
  await search.fill("missing-" + key);
  await expect(page.getByText("No pages match your search.")).toBeVisible();
  await search.clear();
  await expect(grip).toHaveCount(0);
  await sort.selectOption("manual");
  await expect(grip).toBeVisible();
  expect(
    (await rows.allTextContents()).filter((title) => title.startsWith(key)),
  ).toEqual(original);
});
