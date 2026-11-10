import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { selectBlock } from "./editor-controls";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const headers = { Origin: env.NEXT_PUBLIC_APP_URL };
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
const saved = (page: Page) =>
  expect(
    page.getByRole("status", { name: "Auto-save status", exact: true }),
  ).toHaveText("Saved");
test("editor deletion reviews the current saved page, keeps failures, protects homepage and returns to Pages", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await login(page);
  const p = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Editor removal " + Date.now() },
    })
  ).json();
  await page.goto("/admin/pages/" + p.id);
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  const remove = page.getByRole("button", { name: "Delete page", exact: true });
  const title = "Saved before removing " + Date.now();
  await page.getByLabel("Page title", { exact: true }).fill(title);
  await expect(remove).toBeDisabled();
  await saved(page);
  await page.getByLabel("Page date", { exact: true }).fill("2026-11-05");
  await expect(remove).toBeDisabled();
  await expect(
    page.getByRole("status", { name: "Page details status", exact: true }),
  ).toHaveText("Saved");
  await expect(remove).toBeEnabled();
  await remove.click();
  let dialog = page.getByRole("dialog", {
    name: "Move " + title + " to trash?",
    exact: true,
  });
  const confirm = () =>
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm move to trash", exact: true });
  await expect(confirm()).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(remove).toBeFocused();
  expect((await page.request.get("/api/pages/" + p.id)).ok()).toBeTruthy();
  await remove.click();
  await expect(confirm()).toBeEnabled();
  const current = await (await page.request.get("/api/pages/" + p.id)).json();
  expect(
    (
      await page.request.patch("/api/pages/" + p.id, {
        headers,
        data: { version: current.version, title: title + " elsewhere" },
      })
    ).ok(),
  ).toBeTruthy();
  await confirm().click();
  await expect(dialog.getByRole("alert")).toContainText("This page changed");
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await remove.click();
  dialog = page.getByRole("dialog", {
    name: "Move " + title + " elsewhere to trash?",
    exact: true,
  });
  await expect(confirm()).toBeEnabled();
  await page.route("**/api/pages/" + p.id + "/trash", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Removal interrupted. Please retry." }),
    });
  });
  await confirm().click();
  await expect(dialog.getByRole("alert")).toContainText("Removal interrupted");
  await page.screenshot({ path: info.outputPath("editor-delete.png") });
  await page.unrouteAll({ behavior: "wait" });
  await dialog
    .getByRole("button", { name: "Retry action", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const trashed = (await (await page.request.get("/api/trash")).json()).find(
    (item: { id: string }) => item.id === p.id,
  );
  expect(trashed.page_date.slice(0, 10)).toBe("2026-11-05");
  expect(trashed.title).toBe(title + " elsewhere");
  const home = (await (await page.request.get("/api/pages")).json()).find(
    (item: { is_homepage: boolean }) => item.is_homepage,
  );
  await page.goto("/admin/pages/" + home.id);
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(remove).toBeDisabled();
});

test("button padding and radius persist, reset and render with default configurable fade-in", async ({
  page,
  browser,
  baseURL,
  isMobile,
}, info) => {
  test.setTimeout(120000);
  await login(page);
  let p = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Button shape " + Date.now() },
    })
  ).json();
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Section",
        props: {
          id: "shape-section",
          content: [
            {
              type: "Button",
              props: {
                id: "shape-button",
                label: "Shaped button",
                href: "https://example.com/garden",
              },
            },
            {
              type: "Text",
              props: {
                id: "long-memory",
                text: "A quiet memory in our garden. ".repeat(500),
                style: "p",
              },
            },
            {
              type: "Text",
              props: {
                id: "reveal-text",
                text: "A later memory",
                style: "p",
                marginSides: { top: 120 },
              },
            },
          ],
        },
      },
    ],
  };
  p = await (
    await page.request.patch("/api/pages/" + p.id, {
      headers,
      data: { version: p.version, visibility: "public", content },
    })
  ).json();
  await page.goto("/admin/pages/" + p.id);
  await selectBlock(page, "Select Button 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  for (const [side, n] of Object.entries({
    top: 20,
    right: 32,
    bottom: 24,
    left: 40,
  }))
    await page
      .getByLabel("Button padding " + side, { exact: true })
      .fill(String(n));
  const radius = page.getByLabel("Button corner radius · px", { exact: true });
  await radius.fill("32");
  await saved(page);
  await expect(page.getByLabel("Animation type", { exact: true })).toHaveValue(
    "fade-in",
  );
  const frame = page.frameLocator("iframe"),
    editing = frame.locator(".garden-button-block");
  await expect(editing).toHaveAttribute("data-animation", "none");
  await expect(editing).toHaveCSS("animation-name", "none");
  await radius.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("button-shape.png") });
  const visitor = await browser.newContext({
    viewport: { width: isMobile ? 390 : 1280, height: 720 },
  });
  try {
    const view = await visitor.newPage();
    await view.goto(baseURL + "/garden/" + p.slug);
    const button = view.getByRole("link", {
      name: "Shaped button",
      exact: true,
    });
    await expect(button).toHaveCSS("padding-top", "20px");
    await expect(button).toHaveCSS("padding-right", "32px");
    await expect(button).toHaveCSS("padding-bottom", "24px");
    await expect(button).toHaveCSS("padding-left", "40px");
    await expect(button).toHaveCSS("border-radius", "32px");
    const motion = view.locator(".garden-button-block");
    await expect(motion).toHaveAttribute("data-animation", "fade-in");
    await expect(motion).toHaveCSS("animation-name", "garden-fade-in");
    const later = view.locator(".garden-text").last();
    await expect(later).toHaveAttribute("data-motion", "pending");
    await later.scrollIntoViewIfNeeded();
    await expect(later).toHaveAttribute("data-motion", "enter");
    const frames = await motion.evaluate((el) => {
      const effect = el.getAnimations()[0]?.effect;
      return effect instanceof KeyframeEffect
        ? effect.getKeyframes()
        : undefined;
    });
    expect(frames?.[0].transform).toContain("-8px");
    await view.emulateMedia({ reducedMotion: "reduce" });
    await expect(motion).toHaveCSS("animation-name", "none");
    await page
      .getByLabel("Animation type", { exact: true })
      .selectOption("none");
    await page
      .getByRole("button", { name: "Reset button padding", exact: true })
      .click();
    await radius.fill("");
    await saved(page);
    await view.reload();
    await expect(motion).toHaveAttribute("data-animation", "none");
    await expect(button).toHaveCSS("padding-top", "10px");
    const latest = await (await page.request.get("/api/pages/" + p.id)).json();
    for (const bad of [
      { buttonRadius: 1000 },
      { buttonPadding: { left: 121 } },
      { animation: "spin" },
      { animation: ["fade-in"] },
      { buttonPadding: { left: -1 } },
    ]) {
      const invalid = structuredClone(latest.content);
      Object.assign(invalid.content[0].props.content[0].props, bad);
      expect(
        (
          await page.request.patch("/api/pages/" + p.id, {
            headers,
            data: { version: latest.version, content: invalid },
          })
        ).status(),
      ).toBe(400);
    }
  } finally {
    await visitor.close();
  }
});

test("the website drawer and nested menus support keyboard and reduced motion at all sizes", async ({
  page,
}, info) => {
  await login(page);
  const original = await (await page.request.get("/api/navigation")).json();
  const make = (label: string, parentId: string | null = null) => ({
    id: crypto.randomUUID(),
    label,
    parentId,
    destination: {
      kind: "external",
      url: "https://example.com/" + label.toLowerCase(),
    },
  });
  const garden = make("Garden"),
    trips = make("Trips", garden.id),
    reef = make("Reef", trips.id),
    about = make("About");
  try {
    expect(
      (
        await page.request.put("/api/navigation", {
          headers,
          data: {
            version: original.version,
            items: [garden, trips, reef, about],
          },
        })
      ).ok(),
    ).toBeTruthy();
    await page.goto("/admin/navigation");
    await expect(
      page.getByRole("heading", { name: "Your menu", exact: true }),
    ).toHaveCount(0);
    await expect(
      page
        .locator(".visually-hidden")
        .filter({ hasText: "Drop on the center" }),
    ).toHaveCount(1);
    await page.goto("/");
    const height = await page
      .locator(".public-header")
      .evaluate((el) => el.getBoundingClientRect().height);
    const drawer = page.getByRole("dialog", { name: "Menu", exact: true });
    const opener = page.getByRole("button", {
      name: "Open website menu",
      exact: true,
    });
    await opener.click();
    await expect(drawer).toHaveCSS("animation-name", "website-menu-slide-in");
    await expect(drawer).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    const bounds = (await drawer.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(bounds.y).toBe(0);
    expect(bounds.height).toBe(viewport.height);
    expect(bounds.x + bounds.width).toBe(viewport.width);
    const nav = page.getByRole("navigation", {
        name: "Main navigation",
        exact: true,
      }),
      toggle = nav.getByRole("button", {
        name: "Submenu for Garden",
        exact: true,
      });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(toggle).toHaveCSS("border-top-width", "0px");
    await expect(
      nav.getByRole("link", { name: "Trips", exact: true }),
    ).toHaveCount(0);
    await expect(
      nav.getByRole("link", { name: "Garden", exact: true }),
    ).toHaveAttribute("href", "https://example.com/garden");
    await toggle.click();
    await expect(
      nav.getByRole("link", { name: "Trips", exact: true }),
    ).toBeVisible();
    expect(
      await page
        .locator(".public-header")
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBe(height);
    const tripsToggle = nav.getByRole("button", {
      name: "Submenu for Trips",
      exact: true,
    });
    await tripsToggle.click();
    await expect(
      nav.getByRole("link", { name: "Reef", exact: true }),
    ).toBeVisible();
    await expect(
      nav
        .getByRole("button", { name: "Submenu for Trips", exact: true })
        .locator("svg"),
    ).toHaveCSS("transform", "matrix(-1, 0, 0, -1, 0, 0)");
    await page.screenshot({ path: info.outputPath("website-drawer.png") });
    await nav.getByRole("link", { name: "Reef", exact: true }).focus();
    await page.keyboard.press("Escape");
    await expect(
      nav.getByRole("button", { name: "Submenu for Trips", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await toggle.press("ArrowDown");
    await expect(
      nav.getByRole("link", { name: "Trips", exact: true }),
    ).toBeFocused();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(toggle.locator("svg")).toHaveCSS("transition-duration", "0s");
    await expect(drawer).toHaveCSS("animation-name", "none");
    await page.keyboard.press("Escape");
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(opener).toBeFocused();
  } finally {
    const current = await (await page.request.get("/api/navigation")).json();
    await page.request.put("/api/navigation", {
      headers,
      data: { version: current.version, items: original.items },
    });
  }
});
