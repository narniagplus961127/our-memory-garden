import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

test("Pages cards keep right-edge bin icons and load link warnings safely before trashing", async ({
  page,
}, testInfo) => {
  test.setTimeout(120000);
  const headers = { Origin: env.NEXT_PUBLIC_APP_URL };
  await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  const originalMenu = await (await page.request.get("/api/navigation")).json();
  const created = await (
    await page.request.post("/api/pages", {
      headers,
      data: {
        title:
          "A long memory from our garden that stays readable beside its bin icon " +
          Date.now(),
      },
    })
  ).json();
  const menuItem = {
    id: crypto.randomUUID(),
    label: "A link to this memory",
    parentId: null,
    destination: { kind: "page", pageId: created.id },
  };
  expect(
    (
      await page.request.put("/api/navigation", {
        headers,
        data: {
          items: [...originalMenu.items, menuItem],
          version: originalMenu.version,
        },
      })
    ).ok(),
  ).toBeTruthy();
  try {
    await page.goto("/admin/pages");
    const card = page.locator(".admin-page-cards > li").filter({
      has: page.locator('a[href="/admin/pages/' + created.id + '"]'),
    });
    const trigger = card.getByRole("button", {
      name: "Move " + created.title + " to trash",
      exact: true,
    });
    await expect(trigger).toHaveCSS("width", "44px");
    await expect(trigger).toHaveCSS("height", "44px");
    await trigger.scrollIntoViewIfNeeded();
    const row = (await card.boundingBox())!,
      bin = (await trigger.boundingBox())!;
    expect(row.x + row.width - bin.x - bin.width).toBe(17);
    expect(
      Math.abs(row.y + row.height / 2 - bin.y - bin.height / 2),
    ).toBeLessThan(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath("page-list-bin.png") });
    let fail = true,
      posts = 0;
    page.on("request", (request) => {
      if (
        request.method() === "POST" &&
        request.url().endsWith("/" + created.id + "/trash")
      )
        posts++;
    });
    await page.route("**/api/pages/" + created.id + "/trash", (route) =>
      route.request().method() === "GET" && fail
        ? route.fulfill({
            status: 503,
            json: { error: "Link review temporarily unavailable." },
          })
        : route.continue(),
    );
    await trigger.click();
    const dialog = page.getByRole("dialog", {
      name: "Move " + created.title + " to trash?",
      exact: true,
    });
    await expect(dialog.getByRole("alert")).toContainText(
      "Link review temporarily unavailable",
    );
    await expect(dialog).not.toContainText("No current inbound");
    expect(posts).toBe(0);
    fail = false;
    await dialog
      .getByRole("button", { name: "Retry action", exact: true })
      .click();
    await expect(
      dialog.getByRole("link", { name: menuItem.label, exact: true }),
    ).toBeVisible();
    expect(posts).toBe(0);
    await page.screenshot({
      path: testInfo.outputPath("page-trash-links.png"),
    });
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(
      dialog.getByRole("button", {
        name: "Confirm move to trash",
        exact: true,
      }),
    ).toBeEnabled();
    // A stale list must not trash a page edited elsewhere without review.
    expect(
      (
        await page.request.patch("/api/pages/" + created.id, {
          headers,
          data: {
            version: created.version,
            title: created.title,
            visibility: "public",
          },
        })
      ).ok(),
    ).toBeTruthy();
    await dialog
      .getByRole("button", { name: "Confirm move to trash", exact: true })
      .click();
    await expect(dialog.getByRole("alert")).toContainText("This page changed");
    await expect(card).toBeVisible();
    await dialog
      .getByRole("button", { name: "Reload page", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await trigger.click();
    await dialog
      .getByRole("button", { name: "Confirm move to trash", exact: true })
      .click();
    await expect(card).toHaveCount(0);
    await expect(
      page.getByRole("status").filter({ hasText: "Page moved to trash." }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Pages", exact: true }),
    ).toBeFocused();
    await page.goto("/admin");
    await expect(
      page.getByRole("button", { name: /^Move .* to trash$/ }),
    ).toHaveCount(0);
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    const currentMenu = await (
      await page.request.get("/api/navigation")
    ).json();
    await page.request.put("/api/navigation", {
      headers,
      data: { items: originalMenu.items, version: currentMenu.version },
    });
  }
});

test("recovery popups are centered, trap focus, cancel safely and stay open during a request", async ({
  page,
}, testInfo) => {
  const headers = { Origin: env.NEXT_PUBLIC_APP_URL };
  await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  const created = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "A memory to keep " + Date.now() },
    })
  ).json();
  await page.goto("/admin/pages");
  const trigger = page.getByRole("button", {
    name: "Move " + created.title + " to trash",
    exact: true,
  });
  const dialog = page.getByRole("dialog", { name: /^Move .* to trash\?$/ });
  await trigger.click();
  await expect(
    dialog.getByRole("button", { name: "Confirm move to trash", exact: true }),
  ).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  const box = (await dialog.boundingBox())!,
    viewport = page.viewportSize()!;
  expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(10);
  expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(
    10,
  );
  expect(box.width).toBeLessThanOrEqual(viewport.width - 32);
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Confirm move to trash", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("confirmation-popup.png"),
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(
    (await (await page.request.get("/api/pages/" + created.id)).json())
      .deleted_at,
  ).toBeNull();
  let release = () => {},
    started = () => {};
  const held = new Promise<void>((resolve) => {
      release = resolve;
    }),
    arrived = new Promise<void>((resolve) => {
      started = resolve;
    });
  await page.route("**/api/pages/" + created.id + "/trash", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    started();
    await held;
    await route.continue();
  });
  try {
    await trigger.click();
    await dialog
      .getByRole("button", { name: "Confirm move to trash", exact: true })
      .click();
    await arrived;
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeDisabled();
  } finally {
    release();
  }
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("status").filter({ hasText: "Page moved to trash." }),
  ).toBeVisible();
  await page.unrouteAll({ behavior: "wait" });
});
test("administrator reviews history, confirms restore and safely recovers a trashed page", async ({
  page,
}) => {
  const origin = env.NEXT_PUBLIC_APP_URL;
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        headers: { Origin: origin },
        data: {
          email: env.TEST_ADMIN_EMAIL,
          password: env.TEST_ADMIN_PASSWORD,
        },
      })
    ).status(),
  ).toBe(200);
  let p = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "Recovery journey " + Date.now() },
    })
  ).json();
  const title = p.title;
  const revision = p.version;
  p = await (
    await page.request.patch("/api/pages/" + p.id, {
      headers: { Origin: origin },
      data: {
        version: p.version,
        title: "Latest recovery journey",
        text: "Memory before restoration",
        visibility: "public",
      },
    })
  ).json();
  await page.goto("/admin/pages/" + p.id + "/history?version=" + revision);
  await expect(
    page.getByRole("heading", { name: "Version history", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Read-only saved snapshot" }),
  ).toContainText(title);
  // The Pages list must use the latest saved revision after a history restore.
  let releaseRefresh = () => {};
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  const refreshPattern = "**/admin/pages/" + p.id + "/history?**";
  await page.route(refreshPattern, async (route) => {
    if (route.request().headers()["rsc"] === "1") await refreshGate;
    await route.continue();
  });
  try {
    await page
      .getByRole("button", { name: "Restore this version", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: /^Restore version/ }),
    ).toContainText("current saved version will be kept");
    await page
      .getByRole("button", { name: "Confirm restore version", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Version restored");
    const saved = await (await page.request.get("/api/pages/" + p.id)).json();
    expect(saved.title).toBe(title);
    expect(saved.visibility).toBe("public");
    await page.goto("/admin/pages");
    await page
      .getByRole("button", { name: "Move " + title + " to trash", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: /^Move .* to trash\?$/ }),
    ).toContainText("Links to this page");
    await page
      .getByRole("button", { name: "Confirm move to trash", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Page moved to trash." }),
    ).toBeVisible();
  } finally {
    releaseRefresh();
    await page.unrouteAll({ behavior: "wait" });
  }
  await page.goto("/admin/trash");
  const card = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: title,
      exact: true,
      includeHidden: true,
    }),
  });
  await card
    .getByRole("button", { name: "Restore as private", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm restore as private", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole("status")).toBeVisible();
  expect(
    (await (await page.request.get("/api/pages/" + p.id)).json()).visibility,
  ).toBe("private");
  await page.goto("/admin/pages");
  await page
    .getByRole("button", { name: "Move " + title + " to trash", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm move to trash", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Page moved to trash." }),
  ).toBeVisible();
  await page.goto("/admin/trash");
  await card
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: /^Permanently delete/ }),
  ).toContainText("cannot be undone");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(card).toBeVisible();
  await card
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm permanent deletion", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole("status")).toBeVisible();
});
test("anonymous history and trash are denied", async ({ page }) => {
  for (const path of [
    "/admin/trash",
    "/admin/pages/00000000-0000-4000-8000-000000000000/history",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
  for (const path of [
    "/api/trash",
    "/api/pages/00000000-0000-4000-8000-000000000000/history",
  ])
    expect((await page.request.get(path)).status()).toBe(401);
});
test("failed restoration retains the read-only snapshot and can be retried", async ({
  page,
}, testInfo) => {
  const origin = env.NEXT_PUBLIC_APP_URL;
  await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin },
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  let p = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "Retry history " + Date.now() },
    })
  ).json();
  const oldTitle = p.title;
  p = await (
    await page.request.patch("/api/pages/" + p.id, {
      headers: { Origin: origin },
      data: { version: p.version, title: "Current retry title" },
    })
  ).json();
  await page.goto("/admin/pages/" + p.id + "/history?version=1");
  await page.route("**/api/pages/*/history/1", (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Connection interrupted. Current content is safe.",
          }),
        })
      : route.continue(),
  );
  await page
    .getByRole("button", { name: "Restore this version", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm restore version", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Connection interrupted" }),
  ).toContainText("Connection interrupted");
  await expect(
    page.locator('section[aria-label="Read-only saved snapshot"]'),
  ).toContainText(oldTitle);
  expect(
    (await (await page.request.get("/api/pages/" + p.id)).json()).title,
  ).toBe("Current retry title");
  await page.screenshot({
    path: "work/history-" + testInfo.project.name + ".png",
    fullPage: true,
  });
  await page.unroute("**/api/pages/*/history/1");
  await page
    .getByRole("button", { name: "Retry restore", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Version restored");
});
test("failed trash and permanent deletion keep the original state and offer retry", async ({
  page,
}) => {
  const origin = env.NEXT_PUBLIC_APP_URL;
  await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin },
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  const p = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "Retry trash " + Date.now() },
    })
  ).json();
  await page.goto("/admin/pages");
  const path = "**/api/pages/" + p.id + "/trash";
  await page.route(path, (route) =>
    route.request().method() === "GET"
      ? route.continue()
      : route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Trash connection interrupted." }),
        }),
  );
  await page
    .getByRole("button", { name: "Move " + p.title + " to trash", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm move to trash", exact: true })
    .click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Trash connection interrupted." }),
  ).toBeVisible();
  expect((await page.request.get("/api/pages/" + p.id)).status()).toBe(200);
  await page.unroute(path);
  await page.getByRole("button", { name: "Retry action", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Page moved to trash");
  await page.goto("/admin/trash");
  const card = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: p.title,
      exact: true,
      includeHidden: true,
    }),
  });
  await page.route(path, (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Deletion connection interrupted." }),
    }),
  );
  await card
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm permanent deletion", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Deletion connection interrupted",
  );
  await expect(card).toBeVisible();
  expect(
    (await (await page.request.get("/api/trash")).json()).some(
      (item: { id: string }) => item.id === p.id,
    ),
  ).toBe(true);
  await page.unroute(path);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Retry action", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText(
    "Page permanently deleted",
  );
});

test("restoring the homepage keeps trash out of History and protects the Pages-list action", async ({
  page,
}) => {
  const origin = env.NEXT_PUBLIC_APP_URL;
  const signed = await page.request.post("/api/auth/sign-in/email", {
    headers: { Origin: origin },
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  expect(signed.status()).toBe(200);
  let created = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "Homepage recovery guard " + Date.now() },
    })
  ).json();
  const revision = created.version;
  created = await (
    await page.request.patch("/api/pages/" + created.id, {
      headers: { Origin: origin },
      data: { version: created.version, visibility: "public" },
    })
  ).json();
  await page.goto("/admin/settings/homepage");
  await page.getByLabel("Public page").selectOption({ label: created.title });
  await page.getByRole("button", { name: "Choose as homepage" }).click();
  await expect(page.getByRole("status")).toHaveText("Homepage updated");
  await page.goto(
    "/admin/pages/" + created.id + "/history?version=" + revision,
  );
  const trash = page.getByRole("button", {
    name: /^Move .* to trash$/,
    exact: true,
  });
  await expect(trash).toHaveCount(0);
  let releaseRefresh = () => {};
  const refreshGate = new Promise<void>((resolve) => {
    releaseRefresh = resolve;
  });
  await page.route(
    "**/admin/pages/" + created.id + "/history?**",
    async (route) => {
      if (route.request().headers()["rsc"] === "1") await refreshGate;
      await route.continue();
    },
  );
  try {
    await page
      .getByRole("button", { name: "Restore this version", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirm restore version", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Version restored");
    await expect(trash).toHaveCount(0);
    const saved = await (
      await page.request.get("/api/pages/" + created.id)
    ).json();
    expect(saved.is_homepage).toBe(true);
    expect(saved.visibility).toBe("public");
  } finally {
    releaseRefresh();
    await page.unrouteAll({ behavior: "wait" });
  }
  await page.goto("/admin/pages");
  await expect(
    page.getByRole("button", {
      name: "Move " + created.title + " to trash",
      exact: true,
    }),
  ).toBeDisabled();
});
