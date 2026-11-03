import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { selectBlock } from "./editor-controls";

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
async function signIn(page: Page) {
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
async function saved(page: Page) {
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
}

test("button width and custom colours autosave, render publicly, reset and reject invalid data", async ({
  page,
  browser,
  baseURL,
  isMobile,
}) => {
  await signIn(page);
  const created = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Button controls " + Date.now() },
    })
  ).json();
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Button",
        props: {
          id: "button-controls",
          label: "Our next adventure",
          href: "https://example.com",
          variant: "primary",
        },
      },
    ],
  };
  expect(
    (
      await page.request.patch("/api/pages/" + created.id, {
        headers,
        data: { content, visibility: "public", version: created.version },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/admin/pages/" + created.id);
  await selectBlock(page, "Select Button 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  const button = page
    .frameLocator("iframe")
    .locator(".garden-button-block > a");
  const fitWidth = (await button.boundingBox())!.width;
  await expect(
    page.getByRole("button", { name: "Fit content", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByText("Full width", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Button background hex", exact: true })
    .fill("#a75b43");
  await page
    .getByRole("textbox", { name: "Button text colour hex", exact: true })
    .fill("#fff");
  await page
    .getByRole("textbox", { name: "Button text colour hex", exact: true })
    .press("Tab");
  await saved(page);
  await expect(button).toHaveCSS("background-color", "rgb(167, 91, 67)");
  await expect(button).toHaveCSS("color", "rgb(255, 255, 255)");
  expect((await button.boundingBox())!.width).toBeGreaterThan(fitWidth);
  const state = await (
    await page.request.get("/api/pages/" + created.id)
  ).json();
  expect(state.content.content[0].props).toMatchObject({
    width: "full",
    buttonColor: "#a75b43",
    textColor: "#ffffff",
  });
  await page.reload();
  await expect(button).toHaveCSS("background-color", "rgb(167, 91, 67)");
  const visitor = await browser.newContext({ viewport: page.viewportSize()! });
  try {
    const view = await visitor.newPage();
    await view.goto(baseURL + "/p/" + created.id);
    const publicButton = view.locator(".garden-button-block > a");
    await expect(publicButton).toHaveCSS(
      "background-color",
      "rgb(167, 91, 67)",
    );
    await expect(publicButton).toHaveCSS("color", "rgb(255, 255, 255)");
    const widths = await publicButton.evaluate((el) => ({
      button: el.getBoundingClientRect().width,
      parent:
        el.parentElement!.clientWidth -
        parseFloat(getComputedStyle(el.parentElement!).paddingLeft) -
        parseFloat(getComputedStyle(el.parentElement!).paddingRight),
    }));
    expect(Math.abs(widths.button - widths.parent)).toBeLessThanOrEqual(1);
  } finally {
    await visitor.close();
  }
  for (const [key, value] of [
    ["width", "500px"],
    ["buttonColor", "url(https://example.com)"],
    ["textColor", "red;position:fixed"],
    ["textColor", null],
  ]) {
    const invalid = structuredClone(state.content);
    invalid.content[0].props[key as string] = value;
    expect(
      (
        await page.request.patch("/api/pages/" + created.id, {
          headers,
          data: { content: invalid, version: state.version },
        })
      ).status(),
    ).toBe(400);
  }
  await selectBlock(page, "Select Button 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Button background hex", exact: true })
    .fill("#12");
  await expect(
    page.getByRole("textbox", { name: "Button background hex", exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await expect(button).toHaveCSS("background-color", "rgb(167, 91, 67)");
  await page
    .getByRole("button", { name: "Default · Button background", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Default · Button text colour", exact: true })
    .click();
  await page.getByText("Fit content", { exact: true }).click();
  await saved(page);
  await expect(button).toHaveCSS("background-color", "rgb(48, 67, 55)");
  expect(
    Math.abs((await button.boundingBox())!.width - fitWidth),
  ).toBeLessThanOrEqual(1);
  if (isMobile)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(page.viewportSize()!.width);
});

test("sidebar page settings and view link replace header actions; simple templates preserve legacy blocks", async ({
  page,
  browser,
  baseURL,
  isMobile,
}, testInfo) => {
  await signIn(page);
  const created = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Simpler editor " + Date.now(), template: "journal" },
    })
  ).json();
  expect(created.content.content[0].type).toBe("Section");
  expect(created.content.content[0].props.content[0].type).toBe("Text");
  await page.goto("/admin/pages/" + created.id);
  await page
    .getByRole("button", { name: "Open content panel", exact: true })
    .click();
  if (isMobile) {
    const settings = (await page
      .getByRole("button", { name: "Page settings", exact: true })
      .boundingBox())!;
    expect(settings.x).toBeGreaterThanOrEqual(0);
    expect(settings.x + settings.width).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
  }
  for (const name of ["Banner", "Gallery"]) {
    await expect(
      page.getByRole("button", { name: "Add " + name, exact: true }),
    ).toHaveCount(0);
    await expect(page.getByTestId("drawer-item:" + name)).toHaveCount(0);
  }
  await expect(
    page
      .locator(".garden-workspace-bar")
      .getByRole("button", { name: "Page settings", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Dashboard", exact: true }),
  ).toHaveCount(0);
  const viewLink = page.getByRole("link", {
    name: "View page (opens in a new tab)",
    exact: true,
  });
  await expect(viewLink).toHaveAttribute("href", "/p/" + created.id);
  await expect(viewLink).toHaveAttribute("target", "_blank");
  const newTab = page.waitForEvent("popup");
  await viewLink.click();
  const view = await newTab;
  await expect(
    view.getByRole("heading", {
      name: "The moments we grow together",
      exact: true,
    }),
  ).toBeVisible();
  await view.close();
  await page
    .getByRole("navigation", { name: "Editor panels" })
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(
    page.getByLabel("Page settings title", { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Page address", { exact: true })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("sidebar-page-settings.png"),
    fullPage: false,
  });
  const visitor = await browser.newContext();
  try {
    expect(
      (await visitor.request.get(baseURL + "/p/" + created.id)).status(),
    ).toBe(404);
  } finally {
    await visitor.close();
  }
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Banner",
        props: {
          id: "legacy-banner",
          heading: "A preserved welcome",
          description: "Our existing words",
          background: "sage",
        },
      },
      { type: "Gallery", props: { id: "legacy-gallery", photos: [] } },
    ],
  };
  expect(
    (
      await page.request.patch("/api/pages/" + created.id, {
        headers,
        data: { version: created.version, content },
      })
    ).ok(),
  ).toBeTruthy();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open content panel", exact: true }),
  ).toBeEnabled();
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("textbox", { name: "Heading", exact: true }),
  ).toHaveText("A preserved welcome");
  await selectBlock(page, "Select Gallery 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Add gallery photo", exact: true }),
  ).toBeVisible();
  // Homepage links resolve to the real homepage rather than its page-ID address.
  const homepage = await (await page.request.get("/api/pages")).json();
  const home = homepage.find((p: { is_homepage: boolean }) => p.is_homepage);
  await page.goto("/admin/pages/" + home.id);
  await expect(
    page.getByRole("link", {
      name: "View page (opens in a new tab)",
      exact: true,
    }),
  ).toHaveAttribute("href", "/");
});
