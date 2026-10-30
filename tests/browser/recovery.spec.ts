import { test, expect, type Page } from "@playwright/test";
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
async function login(page: Page, prefix = "ADMIN") {
  const base = env.NEXT_PUBLIC_APP_URL;
  const r = await page.request.post(base + "/api/auth/sign-in/email", {
    headers: { Origin: base },
    data: {
      email: env["TEST_" + prefix + "_EMAIL"],
      password: env["TEST_" + prefix + "_PASSWORD"],
    },
  });
  expect(r.status()).toBe(200);
}
async function fixture(page: Page) {
  await login(page);
  const created = await (
    await page.request.post("/api/pages", {
      headers: { Origin: env.NEXT_PUBLIC_APP_URL },
      data: { title: "Recovery garden " + Date.now() },
    })
  ).json();
  await page.goto("/admin/pages/" + created.id);
  return created;
}
async function editText(page: Page, value: string) {
  await page.getByRole("button", { name: "Open content panel" }).click();
  await page
    .getByRole("button", { name: "Select Text 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await page
    .getByRole("textbox", { name: "Text content", exact: true })
    .fill(value);
}
test("unsaved edits recover after reload and clear only after acknowledgement", async ({
  page,
}) => {
  await fixture(page);
  await page.route("**/api/pages/*", (route) =>
    route.request().method() === "PATCH"
      ? route.abort("internetdisconnected")
      : route.continue(),
  );
  await editText(page, "Rosemary after an offline refresh");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await page.reload();
  await expect(
    page.getByText("Recovered work is unsaved until it reaches the garden."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Select Text 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await expect(
    page.getByRole("textbox", { name: "Text content", exact: true }),
  ).toHaveValue("Rosemary after an offline refresh");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await page.unroute("**/api/pages/*");
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("garden-recovery:")),
    ),
  ).toEqual([]);
  await page.reload();
  await page
    .getByRole("button", { name: "Select Text 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await expect(
    page.getByRole("textbox", { name: "Text content", exact: true }),
  ).toHaveValue("Rosemary after an offline refresh");
});

for (const choice of ["mine", "saved", "manual"] as const)
  test(
    "compare text and " +
      choice +
      " without reverting another administrator's privacy",
    async ({ page, browser, isMobile }) => {
      const created = await fixture(page),
        path = "/api/pages/" + created.id,
        origin = env.NEXT_PUBLIC_APP_URL;
      const text = (id: string, value: string) => ({
        type: "Text",
        props: { id, text: value, style: "p" },
      });
      const initial = await (
        await page.request.patch(path, {
          headers: { Origin: origin },
          data: {
            version: created.version,
            visibility: "public",
            content: {
              root: { props: {} },
              content: [text("a", "rose"), text("b", "old B")],
            },
          },
        })
      ).json();
      await page.reload();
      const secondContext = await browser.newContext({
        viewport: isMobile
          ? { width: 390, height: 844 }
          : { width: 1280, height: 900 },
      });
      const second = await secondContext.newPage();
      await login(second, "OTHER");
      await second.goto(origin + "/admin/pages/" + created.id);
      await editText(page, "lily");
      await page
        .getByLabel("Page title", { exact: true })
        .fill("A private new title");
      await page
        .getByLabel("Page visibility", { exact: true })
        .selectOption("private");
      await expect(
        page.getByRole("status", { name: "Auto-save status" }),
      ).toHaveText("Saved");
      await editText(second, "fern");
      const comparison = second.getByRole("region", {
        name: "Resolve editing conflicts",
      });
      await expect(comparison).toBeVisible();
      await expect(
        comparison.getByLabel("Your text", { exact: true }),
      ).toHaveValue("fern");
      await expect(
        comparison.getByLabel("Saved text", { exact: true }),
      ).toHaveValue("lily");
      await expect(
        second.getByLabel("Page visibility", { exact: true }),
      ).toHaveValue("private");
      await expect(
        second.getByLabel("Page title", { exact: true }),
      ).toHaveValue("A private new title");
      if (choice === "mine")
        await second.screenshot({
          path:
            "work/ticket09-evidence/conflict-" +
            (isMobile ? "mobile" : "desktop") +
            ".png",
          fullPage: true,
        });
      // A fresh independent edit after comparison must survive the eventual choice too.
      const latest = await (await page.request.get(path)).json();
      latest.content.content[1].props.text = "New independent B";
      expect(
        (
          await page.request.patch(path, {
            headers: { Origin: origin },
            data: { content: latest.content, version: latest.version },
          })
        ).status(),
      ).toBe(200);
      if (choice === "manual") {
        await comparison
          .getByRole("button", { name: "Copy and edit manually", exact: true })
          .click();
        await comparison
          .getByLabel("Combined text", { exact: true })
          .fill("fern and lily together");
        await comparison
          .getByRole("button", { name: "Use combined text", exact: true })
          .click();
      } else
        await comparison
          .getByRole("button", {
            name: choice === "mine" ? "Keep mine" : "Use saved version",
            exact: true,
          })
          .click();
      await expect(comparison).toHaveCount(0);
      await expect(
        second.getByRole("status", { name: "Auto-save status" }),
      ).toHaveText("Saved");
      const final = await (await second.request.get(origin + path)).json();
      expect(final.visibility).toBe("private");
      expect(final.title).toBe("A private new title");
      expect(
        final.content.content.map(
          (b: { props: { text: string } }) => b.props.text,
        ),
      ).toEqual([
        choice === "mine"
          ? "fern"
          : choice === "saved"
            ? "lily"
            : "fern and lily together",
        "New independent B",
      ]);
      await expect(
        second
          .frameLocator("iframe")
          .getByText("New independent B", { exact: true }),
      ).toBeVisible();
      const visitor = await browser.newContext();
      expect((await visitor.request.get(origin + path)).status()).toBe(404);
      expect(
        (await visitor.request.get(origin + "/p/" + initial.id)).status(),
      ).toBe(404);
      await visitor.close();
      await secondContext.close();
    },
  );

test("tabs keep separate drafts and sign-out clears account recovery before late save callbacks", async ({
  page,
  context,
}) => {
  const created = await fixture(page),
    origin = env.NEXT_PUBLIC_APP_URL;
  const second = await context.newPage();
  await second.goto(origin + "/admin/pages/" + created.id);
  await second.route("**/api/pages/*", (route) =>
    route.request().method() === "PATCH"
      ? route.abort("internetdisconnected")
      : route.continue(),
  );
  await editText(second, "Private second tab draft");
  await expect(
    second.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await editText(page, "First tab acknowledged");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).filter((k) =>
          k.startsWith("garden-recovery:"),
        ).length,
    ),
  ).toBe(1);
  let release!: () => void, committed!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve)),
    started = new Promise<void>((resolve) => (committed = resolve));
  await page.route("**/api/pages/*", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    const response = await route.fetch();
    committed();
    await gate;
    try {
      await route.fulfill({ response });
    } catch {}
  });
  await page
    .getByRole("textbox", { name: "Text content", exact: true })
    .fill("Private pending late response");
  await started;
  const signout = await context.newPage();
  await signout.goto(origin + "/admin/pages");
  const mobileMenu = signout.getByRole("button", {
    name: "Open administration menu",
  });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
  await signout.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(signout).toHaveURL(/\/login$/);
  release();
  await expect(page).toHaveURL(/\/login$/);
  await expect(second).toHaveURL(/\/login$/);
  expect(
    await signout.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("garden-recovery:")),
    ),
  ).toEqual([]);
  await signout.reload();
  expect(
    await signout.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("garden-recovery:")),
    ),
  ).toEqual([]);
});

for (const choice of ["mine", "saved"] as const)
  test(
    "contested moves and deletion require a " + choice + " layout choice",
    async ({ page, browser, isMobile }) => {
      const created = await fixture(page),
        origin = env.NEXT_PUBLIC_APP_URL,
        path = "/api/pages/" + created.id;
      const text = (id: string, value: string) => ({
        type: "Text",
        props: { id, text: value, style: "p" },
      });
      const doc = (...content: ReturnType<typeof text>[]) => ({
        root: { props: {} },
        content,
      });
      let initial = await (
        await page.request.patch(path, {
          headers: { Origin: origin },
          data: {
            version: created.version,
            content: doc(text("a", "A"), text("b", "B"), text("c", "C")),
          },
        })
      ).json();
      await page.reload();
      const secondContext = await browser.newContext({
        viewport: isMobile
          ? { width: 390, height: 844 }
          : { width: 1280, height: 900 },
      });
      const second = await secondContext.newPage();
      await login(second, "OTHER");
      await second.goto(origin + "/admin/pages/" + created.id);
      // Saved B moves after C while the second administrator puts B first.
      const remote = await page.request.patch(path, {
        headers: { Origin: origin },
        data: {
          version: initial.version,
          content: doc(
            text("a", "A"),
            text("c", "Remote C survives"),
            text("b", "B"),
          ),
        },
      });
      expect(remote.status()).toBe(200);
      await second
        .getByRole("button", { name: "Select Text 2", exact: true })
        .click();
      await second.getByRole("button", { name: "Open settings panel" }).click();
      await second
        .getByRole("button", { name: "Move block up", exact: true })
        .click();
      const comparison = second.getByRole("region", {
        name: "Resolve editing conflicts",
      });
      await expect(comparison).toBeVisible();
      await comparison
        .getByRole("button", { name: "Continue editing", exact: true })
        .click();
      expect(
        (await (await page.request.get(path)).json()).content.content.map(
          (b: { props: { id: string } }) => b.props.id,
        ),
      ).toEqual(["a", "c", "b"]);
      await comparison
        .getByRole("button", {
          name: choice === "mine" ? "Keep my layout" : "Use saved layout",
          exact: true,
        })
        .click();
      await expect(
        second.getByRole("status", { name: "Auto-save status" }),
      ).toHaveText("Saved");
      const moved = await (await second.request.get(origin + path)).json();
      expect(
        moved.content.content.map((b: { props: { id: string } }) => b.props.id),
      ).toEqual(choice === "mine" ? ["b", "a", "c"] : ["a", "c", "b"]);
      expect(
        moved.content.content.find(
          (b: { props: { id: string } }) => b.props.id === "c",
        ).props.text,
      ).toBe("Remote C survives");
      // Fresh same-page base: a deletion contested by a saved text edit needs another explicit decision.
      await second.reload();
      const current = await (await page.request.get(path)).json();
      current.content.content.find(
        (b: { props: { id: string } }) => b.props.id === "b",
      ).props.text = "Saved B before deletion";
      expect(
        (
          await page.request.patch(path, {
            headers: { Origin: origin },
            data: { version: current.version, content: current.content },
          })
        ).status(),
      ).toBe(200);
      const index =
        moved.content.content.findIndex(
          (b: { props: { id: string } }) => b.props.id === "b",
        ) + 1;
      await second
        .getByRole("button", { name: "Select Text " + index, exact: true })
        .click();
      await second.getByRole("button", { name: "Open settings panel" }).click();
      await second
        .getByRole("button", { name: "Remove block", exact: true })
        .click();
      await expect(comparison).toBeVisible();
      await expect(
        comparison.getByLabel("Saved change", { exact: true }),
      ).toHaveValue(/Saved B before deletion/);
      await comparison
        .getByRole("button", {
          name: choice === "mine" ? "Keep my layout" : "Use saved layout",
          exact: true,
        })
        .click();
      await expect(
        second.getByRole("status", { name: "Auto-save status" }),
      ).toHaveText("Saved");
      const final = await (await second.request.get(origin + path)).json();
      expect(
        final.content.content.some(
          (b: { props: { id: string } }) => b.props.id === "b",
        ),
      ).toBe(choice === "saved");
      if (choice === "saved")
        expect(
          final.content.content.find(
            (b: { props: { id: string } }) => b.props.id === "b",
          ).props.text,
        ).toBe("Saved B before deletion");
      await secondContext.close();
    },
  );

test("typing during a committed in-flight merge keeps the newest local text and remote block", async ({
  page,
  browser,
}) => {
  const created = await fixture(page),
    origin = env.NEXT_PUBLIC_APP_URL,
    path = "/api/pages/" + created.id;
  const text = (id: string, value: string) => ({
    type: "Text",
    props: { id, text: value, style: "p" },
  });
  const initial = await (
    await page.request.patch(path, {
      headers: { Origin: origin },
      data: {
        version: created.version,
        content: {
          root: { props: {} },
          content: [text("a", "old A"), text("b", "old B")],
        },
      },
    })
  ).json();
  await page.reload();
  const other = await browser.newContext(),
    otherPage = await other.newPage();
  await login(otherPage, "OTHER");
  let release!: () => void,
    committed!: () => void,
    first = true;
  const gate = new Promise<void>((r) => (release = r)),
    started = new Promise<void>((r) => (committed = r));
  await page.route("**/api/pages/*", async (route) => {
    if (route.request().method() !== "PATCH" || !first) return route.continue();
    first = false;
    expect(
      (
        await other.request.patch(origin + path, {
          headers: { Origin: origin },
          data: {
            version: initial.version,
            content: {
              root: { props: {} },
              content: [text("a", "old A"), text("b", "Remote beta")],
            },
          },
        })
      ).status(),
    ).toBe(200);
    const response = await route.fetch();
    committed();
    await gate;
    await route.fulfill({ response });
  });
  await editText(page, "Submitted alpha");
  await started;
  await page
    .getByRole("textbox", { name: "Text content", exact: true })
    .fill("Newest alpha two");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saving…");
  release();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await expect(
    page.getByRole("textbox", { name: "Text content", exact: true }),
  ).toHaveValue("Newest alpha two");
  await expect(
    page.frameLocator("iframe").getByText("Remote beta", { exact: true }),
  ).toBeVisible();
  await page.reload();
  const final = await (await page.request.get(path)).json();
  expect(
    final.content.content.map((b: { props: { text: string } }) => b.props.text),
  ).toEqual(["Newest alpha two", "Remote beta"]);
  await other.close();
});

test("a committed save with a lost response can retry without another version", async ({
  page,
}) => {
  const created = await fixture(page),
    path = "/api/pages/" + created.id;
  let first = true,
    committedVersion = 0;
  await page.route("**/api/pages/*", async (route) => {
    if (route.request().method() !== "PATCH" || !first) return route.continue();
    first = false;
    const response = await route.fetch();
    committedVersion = (await response.json()).version;
    await route.abort("connectionreset");
  });
  await editText(page, "A saved response lost in the rain");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const final = await (await page.request.get(path)).json();
  expect(final.version).toBe(committedVersion);
  expect(final.content.content[0].props.text).toBe(
    "A saved response lost in the rain",
  );
});

test("unavailable device storage is disclosed while edits remain retryable in memory", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key.startsWith("garden-recovery:"))
        throw new DOMException("Full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await fixture(page);
  await page.route("**/api/pages/*", (route) =>
    route.request().method() === "PATCH"
      ? route.abort("internetdisconnected")
      : route.continue(),
  );
  await editText(page, "A memory kept in this open editor");
  await expect(
    page.getByText(
      "Device recovery is unavailable. Keep this editor open until your changes are saved.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await page.unroute("**/api/pages/*");
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
});

test("manual comparison text remains recoverable before a conflict choice", async ({
  page,
}) => {
  const created = await fixture(page),
    path = "/api/pages/" + created.id;
  created.content.content[0].props.text = "Saved lily";
  expect(
    (
      await page.request.patch(path, {
        headers: { Origin: env.NEXT_PUBLIC_APP_URL },
        data: { version: created.version, content: created.content },
      })
    ).status(),
  ).toBe(200);
  await editText(page, "Local fern");
  const comparison = page.getByRole("region", {
    name: "Resolve editing conflicts",
  });
  await expect(comparison).toBeVisible();
  await comparison
    .getByRole("button", { name: "Copy and edit manually", exact: true })
    .click();
  await comparison
    .getByLabel("Combined text", { exact: true })
    .fill("A carefully composed fern and lily");
  await page.reload();
  await expect(
    page.getByText("Recovered work is unsaved until it reaches the garden."),
  ).toBeVisible();
  await expect(comparison).toBeVisible();
  await expect(comparison.getByLabel("Your text", { exact: true })).toHaveValue(
    "A carefully composed fern and lily",
  );
  await comparison
    .getByRole("button", { name: "Keep mine", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
});

test("closed-tab recovery offers an explicit copy and clears that acknowledged copy", async ({
  page,
  context,
}) => {
  const created = await fixture(page),
    origin = env.NEXT_PUBLIC_APP_URL;
  await page.route("**/api/pages/*", (route) =>
    route.request().method() === "PATCH"
      ? route.abort("internetdisconnected")
      : route.continue(),
  );
  await editText(page, "The closed tab's unsaved rosemary");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await page.close();
  const reopened = await context.newPage();
  await reopened.route("**/api/pages/*", (route) =>
    route.request().method() === "PATCH"
      ? route.abort("internetdisconnected")
      : route.continue(),
  );
  await reopened.goto(origin + "/admin/pages/" + created.id);
  await expect(
    reopened.getByRole("button", { name: "Recover device copy", exact: true }),
  ).toBeVisible();
  await reopened
    .getByRole("button", { name: "Recover device copy", exact: true })
    .click();
  await expect(
    reopened.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await reopened.reload();
  await expect(
    reopened.getByText(
      "Recovered work is unsaved until it reaches the garden.",
    ),
  ).toBeVisible();
  await expect(
    reopened.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await reopened.unroute("**/api/pages/*");
  await reopened
    .getByRole("button", { name: "Retry save", exact: true })
    .click();
  await expect(
    reopened.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const final = await (
    await reopened.request.get(origin + "/api/pages/" + created.id)
  ).json();
  expect(final.content.content[0].props.text).toBe(
    "The closed tab's unsaved rosemary",
  );
  expect(
    await reopened.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith("garden-recovery:")),
    ),
  ).toEqual([]);
});

test("continuing to edit a conflict can converge on the saved text", async ({
  page,
}) => {
  const created = await fixture(page),
    path = "/api/pages/" + created.id;
  created.content.content[0].props.text = "Saved lily";
  await page.request.patch(path, {
    headers: { Origin: env.NEXT_PUBLIC_APP_URL },
    data: { version: created.version, content: created.content },
  });
  await editText(page, "Local fern");
  await expect(
    page.getByRole("region", { name: "Resolve editing conflicts" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Text content", exact: true })
    .fill("Saved lily");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await expect(
    page.getByRole("region", { name: "Resolve editing conflicts" }),
  ).toHaveCount(0);
});

test("an in-flight reconciliation conflict stays unresolved after refresh", async ({
  page,
  browser,
}) => {
  const created = await fixture(page),
    origin = env.NEXT_PUBLIC_APP_URL,
    path = "/api/pages/" + created.id;
  const text = (id: string, value: string) => ({
    type: "Text",
    props: { id, text: value, style: "p" },
  });
  const doc = (a: string, b: string) => ({
    root: { props: {} },
    content: [text("a", a), text("b", b)],
  });
  const initial = await (
    await page.request.patch(path, {
      headers: { Origin: origin },
      data: { version: created.version, content: doc("old A", "old B") },
    })
  ).json();
  await page.reload();
  const other = await browser.newContext(),
    otherPage = await other.newPage();
  await login(otherPage, "OTHER");
  let release!: () => void,
    committed!: () => void,
    first = true;
  const gate = new Promise<void>((r) => (release = r)),
    started = new Promise<void>((r) => (committed = r));
  await page.route("**/api/pages/*", async (route) => {
    if (route.request().method() !== "PATCH" || !first) return route.continue();
    first = false;
    expect(
      (
        await other.request.patch(origin + path, {
          headers: { Origin: origin },
          data: { version: initial.version, content: doc("Remote A", "old B") },
        })
      ).status(),
    ).toBe(200);
    const response = await route.fetch();
    committed();
    await gate;
    await route.fulfill({ response });
  });
  await page
    .getByRole("button", { name: "Select Text 2", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await page
    .getByRole("textbox", { name: "Text content", exact: true })
    .fill("Submitted B");
  await started;
  await editText(page, "Local A during the request");
  release();
  const comparison = page.getByRole("region", {
    name: "Resolve editing conflicts",
  });
  await expect(comparison).toBeVisible();
  await expect(comparison.getByLabel("Your text", { exact: true })).toHaveValue(
    "Local A during the request",
  );
  await page.reload();
  await expect(
    page.getByText("Recovered work is unsaved until it reaches the garden."),
  ).toBeVisible();
  await expect(comparison).toBeVisible();
  await expect(
    comparison.getByLabel("Saved text", { exact: true }),
  ).toHaveValue("Remote A");
  expect(
    (await (await page.request.get(path)).json()).content.content[0].props.text,
  ).toBe("Remote A");
  await comparison
    .getByRole("button", { name: "Keep mine", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const final = await (await page.request.get(path)).json();
  expect(
    final.content.content.map((b: { props: { text: string } }) => b.props.text),
  ).toEqual(["Local A during the request", "Submitted B"]);
  await other.close();
});

test("another administrator cannot recover this account's device draft", async ({
  page,
}) => {
  await fixture(page);
  await page.route("**/api/pages/*", (route) =>
    route.request().method() === "PATCH"
      ? route.abort("internetdisconnected")
      : route.continue(),
  );
  await editText(page, "An unsaved account-scoped private memory");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await login(page, "OTHER");
  await page.reload();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await expect(
    page.getByRole("button", { name: "Recover device copy", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Recovered work is unsaved until it reaches the garden."),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Select Text 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await expect(
    page.getByRole("textbox", { name: "Text content", exact: true }),
  ).toHaveValue("");
});
