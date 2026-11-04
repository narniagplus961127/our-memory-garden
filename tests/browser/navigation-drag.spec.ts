import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
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
async function saved(page: Page) {
  await expect(
    page.getByRole("status", { name: "Navigation status", exact: true }),
  ).toHaveText("Saved");
}
test("drag handles reorder siblings with mouse/touch, preserve children, cancel safely and retry failed saves", async ({
  page,
  isMobile,
  browser,
  baseURL,
}, testInfo) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: isMobile ? 390 : 1440, height: 1400 });
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
  const original = await (await page.request.get("/api/navigation")).json();
  const make = (label: string, parentId: string | null = null) => ({
    id: crypto.randomUUID(),
    label,
    parentId,
    destination: { kind: "external", url: "https://example.com/" + label },
  });
  const alpha = make("Alpha"),
    one = make("One", alpha.id),
    two = make("Two", alpha.id),
    beta = make("Beta"),
    gamma = make("Gamma");
  expect(
    (
      await page.request.put("/api/navigation", {
        headers,
        data: {
          items: [alpha, one, two, beta, gamma],
          version: original.version,
        },
      })
    ).ok(),
  ).toBeTruthy();
  const touch = isMobile ? await page.context().newCDPSession(page) : null;
  const visitor = await browser.newContext({ viewport: page.viewportSize()! });
  try {
    await page.goto("/admin/navigation");
    const roots = page.locator(
      'section[aria-label="Menu items"] > ol > li > .navigation-item strong',
    );
    await expect(roots).toHaveText(["Alpha", "Beta", "Gamma"]);
    await expect(
      page.getByRole("button", { name: /^Move .* (up|down)$/ }),
    ).toHaveCount(0);
    const handle = page.getByRole("button", {
      name: "Drag Gamma",
      exact: true,
    });
    await expect(handle).toHaveCSS("cursor", "grab");
    await expect(handle).toHaveCSS("touch-action", "none");
    let capturedDrag = false;
    async function drag(label: string, target: string, cancel = false) {
      const control = page.getByRole("button", {
        name: "Drag " + label,
        exact: true,
      });
      const from = (await control.boundingBox())!;
      const row = page.locator(
        '[data-menu-item="' + target + '"] > .navigation-item',
      );
      const to = (await row.boundingBox())!;
      const x = from.x + from.width / 2,
        y = from.y + from.height / 2,
        tx = to.x + 24,
        ty = to.y + 3;
      if (touch)
        await touch.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x, y }],
        });
      else {
        await page.mouse.move(x, y);
        await page.mouse.down();
      }
      for (let step = 1; step <= 20; step++) {
        const point = {
          x: x + ((tx - x) * step) / 20,
          y: y + ((ty - y) * step) / 20,
        };
        if (touch)
          await touch.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [point],
          });
        else await page.mouse.move(point.x, point.y);
      }
      await expect(page.locator(".navigation-drag-preview")).toBeVisible();
      await expect(
        page.locator('[data-menu-item="' + target + '"]'),
      ).toHaveAttribute("data-drop", "before");
      if (!capturedDrag) {
        capturedDrag = true;
        await page.screenshot({
          path: testInfo.outputPath("navigation-dragging.png"),
          // Full-page capture can resize the emulated phone viewport and cancel
          // an active native touch gesture. Capture the visible drop marker.
          fullPage: false,
        });
      }
      if (cancel) {
        if (touch)
          await touch.send("Input.dispatchTouchEvent", {
            type: "touchCancel",
            touchPoints: [],
          });
        else {
          await page.keyboard.press("Escape");
          await page.mouse.up();
        }
      } else if (touch)
        await touch.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      else await page.mouse.up();
      await expect(page.locator(".navigation-drag-preview")).toHaveCount(0);
    }
    await drag("Gamma", alpha.id);
    await saved(page);
    await expect(roots).toHaveText(["Gamma", "Alpha", "Beta"]);
    await page.reload();
    await expect(roots).toHaveText(["Gamma", "Alpha", "Beta"]);
    // Reorder inside the submenu without changing its parent or its siblings' parent.
    await drag("Two", one.id);
    await saved(page);
    const children = page.locator(
      '[data-menu-item="' + alpha.id + '"] > ol > li > .navigation-item strong',
    );
    await expect(children).toHaveText(["Two", "One"]);
    const state = await (await page.request.get("/api/navigation")).json();
    expect(
      state.items
        .filter((i: { parentId: string }) => i.parentId === alpha.id)
        .map((i: { id: string }) => i.id),
    ).toEqual([two.id, one.id]);
    await drag("Beta", gamma.id, true);
    await saved(page);
    await expect(roots).toHaveText(["Gamma", "Alpha", "Beta"]);
    expect(
      (await (await page.request.get("/api/navigation")).json()).version,
    ).toBe(state.version);
    const alphaHandle = page.getByRole("button", {
      name: "Drag Alpha",
      exact: true,
    });
    await alphaHandle.focus();
    await alphaHandle.press("Space");
    await alphaHandle.press("ArrowUp");
    await alphaHandle.press("Escape");
    await expect(roots).toHaveText(["Gamma", "Alpha", "Beta"]);
    await alphaHandle.press("Space");
    await alphaHandle.press("ArrowUp");
    await alphaHandle.press("Enter");
    await saved(page);
    await expect(alphaHandle).toBeFocused();
    await expect(roots).toHaveText(["Alpha", "Gamma", "Beta"]);
    await expect(children).toHaveText(["Two", "One"]);
    let failed = false;
    await page.route("**/api/navigation", async (route) => {
      if (route.request().method() === "PUT" && !failed) {
        failed = true;
        await route.abort("failed");
      } else await route.continue();
    });
    await drag("Beta", alpha.id);
    await expect(
      page.getByRole("status", { name: "Navigation status", exact: true }),
    ).toHaveText("Not saved");
    await expect(roots).toHaveText(["Beta", "Alpha", "Gamma"]);
    await page
      .getByRole("button", { name: "Retry menu changes", exact: true })
      .click();
    await saved(page);
    await page.unroute("**/api/navigation");
    await page.reload();
    await expect(roots).toHaveText(["Beta", "Alpha", "Gamma"]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(page.viewportSize()!.width);
    await page.screenshot({
      path: testInfo.outputPath("navigation-drag.png"),
      fullPage: true,
    });
    const view = await visitor.newPage();
    await view.goto(baseURL + "/");
    if (isMobile)
      await view
        .getByRole("button", { name: "Open website menu", exact: true })
        .click();
    const nav = view.getByRole("navigation", {
      name: isMobile ? "Mobile navigation" : "Main navigation",
      exact: true,
    });
    await expect(nav.locator(":scope > ul > li > a")).toHaveText([
      "Beta",
      "Alpha",
      "Gamma",
    ]);
    await expect(
      nav.getByRole("link", { name: "Two", exact: true }),
    ).toBeVisible();
  } finally {
    await page.unroute("**/api/navigation");
    await visitor.close();
    await touch?.detach();
    const current = await (await page.request.get("/api/navigation")).json();
    expect(
      (
        await page.request.put("/api/navigation", {
          headers,
          data: { items: original.items, version: current.version },
        })
      ).ok(),
    ).toBeTruthy();
  }
});
