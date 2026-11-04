import {
  canvasField,
  writeCanvas,
  selectBlock,
  setVisibility,
  seedLegacyTextPage,
} from "./editor-controls";
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
  let created = await (
    await page.request.post("/api/pages", {
      headers: { Origin: env.NEXT_PUBLIC_APP_URL },
      data: { title: "Recovery garden " + Date.now() },
    })
  ).json();
  created = await seedLegacyTextPage(page, created, env.NEXT_PUBLIC_APP_URL);
  await page.goto("/admin/pages/" + created.id);
  return created;
}
async function editText(page: Page, value: string) {
  await page.getByRole("button", { name: "Open content panel" }).click();
  await selectBlock(page, "Select Text 1");
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await writeCanvas(page, "Text content", value);
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
  await selectBlock(page, "Select Text 1");
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await expect(canvasField(page, "Text content")).toHaveText(
    "Rosemary after an offline refresh",
  );
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
  await selectBlock(page, "Select Text 1");
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await expect(canvasField(page, "Text content")).toHaveText(
    "Rosemary after an offline refresh",
  );
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
      await setVisibility(page, "private");
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
  await writeCanvas(page, "Text content", "Private pending late response");
  await started;
  const signout = await context.newPage();
  await signout.goto(origin + "/admin/pages");
  const mobileMenu = signout.getByLabel("Open administration menu");
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
      await selectBlock(second, "Select Text 2");
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
      await selectBlock(second, "Select Text " + index);
      await second.getByRole("button", { name: "Open settings panel" }).click();
      await second
        .getByRole("button", { name: "Remove block", exact: true })
        .click();
      await second
        .getByRole("dialog")
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
  await writeCanvas(page, "Text content", "Newest alpha two");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saving…");
  release();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await expect(canvasField(page, "Text content")).toHaveText(
    "Newest alpha two",
  );
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
  await writeCanvas(page, "Text content", "Saved lily");
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
  await selectBlock(page, "Select Text 2");
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await writeCanvas(page, "Text content", "Submitted B");
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
  await selectBlock(page, "Select Text 1");
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await expect(canvasField(page, "Text content")).toHaveText("");
});

test("recovering another tab reads its newest draft and retains later source edits", async ({
  page,
  context,
}) => {
  const created = await fixture(page);
  await page.route("**/api/pages/*", (route) =>
    route.request().method() === "PATCH"
      ? route.abort("internetdisconnected")
      : route.continue(),
  );
  await editText(page, "First source rosemary");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  const recipient = await context.newPage();
  await recipient.goto("/admin/pages/" + created.id);
  const recover = recipient.getByRole("button", {
    name: "Recover device copy",
    exact: true,
  });
  await expect(recover).toBeVisible();
  await writeCanvas(page, "Text content", "Newest source rosemary");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await recipient.route("**/api/pages/*", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    await gate;
    await route.continue();
  });
  try {
    await recover.click();
    await recipient.getByRole("button", { name: "Open content panel" }).click();
    await selectBlock(recipient, "Select Text 1");
    await recipient
      .getByRole("button", { name: "Open settings panel" })
      .click();
    await expect(canvasField(recipient, "Text content")).toHaveText(
      "Newest source rosemary",
    );
    await writeCanvas(
      page,
      "Text content",
      "Later unacknowledged source rosemary",
    );
    await expect(
      page.getByRole("status", { name: "Auto-save status" }),
    ).toHaveText("Not saved");
  } finally {
    release();
  }
  await expect(
    recipient.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  expect(
    (await (await recipient.request.get("/api/pages/" + created.id)).json())
      .content.content[0].props.text,
  ).toBe("Newest source rosemary");
  await page.reload();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await selectBlock(page, "Select Text 1");
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await expect(canvasField(page, "Text content")).toHaveText(
    "Later unacknowledged source rosemary",
  );
});

test("other device recovery waits until current unsaved and in-flight work is saved", async ({
  page,
  context,
}) => {
  const created = await fixture(page);
  await page.route("**/api/pages/*", (route) =>
    route.request().method() === "PATCH"
      ? route.abort("internetdisconnected")
      : route.continue(),
  );
  await editText(page, "Other tab's rosemary");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  const current = await context.newPage();
  await current.goto("/admin/pages/" + created.id);
  const recover = current.getByRole("button", {
    name: "Recover device copy",
    exact: true,
  });
  await expect(recover).toBeEnabled();
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve)),
    started = new Promise<void>((resolve) => (entered = resolve));
  await current.route("**/api/pages/*", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    entered();
    await gate;
    await route.abort("internetdisconnected");
  });
  try {
    await editText(current, "Current tab's irreplaceable fern");
    await started;
    await expect(recover).toBeDisabled();
    await expect(
      current.getByText(
        "Save or resolve your current work before recovering another copy.",
      ),
    ).toBeVisible();
  } finally {
    release();
  }
  await expect(
    current.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await expect(recover).toBeDisabled();
  await current.reload();
  await expect(
    current.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await expect(recover).toBeDisabled();
  await current
    .getByRole("button", { name: "Open outline panel", exact: true })
    .click();
  if ((current.viewportSize()?.width ?? 1280) <= 760) {
    const toast = await current
      .getByRole("alert")
      .filter({ hasText: "Your edits remain in this editor." })
      .boundingBox();
    const panel = await current
      .getByRole("complementary", { name: "Page outline", exact: true })
      .boundingBox();
    expect(toast).not.toBeNull();
    expect(panel).not.toBeNull();
    expect(toast!.y + toast!.height).toBeLessThanOrEqual(panel!.y - 12);
  }
  await current
    .getByRole("button", { name: "Select Text 1", exact: true })
    .click();
  await current.getByRole("button", { name: "Open settings panel" }).click();
  await expect(canvasField(current, "Text content")).toHaveText(
    "Current tab's irreplaceable fern",
  );
  await current.unroute("**/api/pages/*");
  await current
    .getByRole("button", { name: "Retry save", exact: true })
    .click();
  await expect(
    current.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await expect(recover).toBeEnabled();
  expect(
    (await (await current.request.get("/api/pages/" + created.id)).json())
      .content.content[0].props.text,
  ).toBe("Current tab's irreplaceable fern");
  const acknowledged = await (
    await current.request.get("/api/pages/" + created.id)
  ).json();
  acknowledged.content.content[0].props.text =
    "Remote lily after acknowledgement";
  // This request represents a legacy plain-text client rather than an inline edit.
  delete acknowledged.content.content[0].props.textRich;
  expect(
    (
      await current.request.patch("/api/pages/" + created.id, {
        headers: { Origin: env.NEXT_PUBLIC_APP_URL },
        data: { version: acknowledged.version, content: acknowledged.content },
      })
    ).status(),
  ).toBe(200);
  await writeCanvas(current, "Text content", "Current contested fern");
  const comparison = current.getByRole("region", {
    name: "Resolve editing conflicts",
  });
  await expect(comparison).toBeVisible();
  await expect(recover).toBeDisabled();
  await comparison
    .getByRole("button", { name: "Keep mine", exact: true })
    .click();
  await expect(
    current.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await expect(recover).toBeEnabled();
});

test("failed and unfinished page addresses survive refresh and retry", async ({
  page,
}) => {
  const created = await fixture(page),
    address = page.getByLabel("Page address", { exact: true });
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await page.route("**/api/pages/*/address", (route) =>
    route.abort("internetdisconnected"),
  );
  const wanted = "recovered-rosemary-" + Date.now();
  await address.fill(wanted);
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Not saved",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(address).toHaveValue(wanted);
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Not saved",
  );
  await address.fill("unfinished address-");
  await page.reload();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(address).toHaveValue("unfinished address-");
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Not saved",
  );
  await address.fill(wanted);
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Not saved",
  );
  await page.unroute("**/api/pages/*/address");
  await page
    .getByRole("button", { name: "Retry address", exact: true })
    .click();
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Saved",
  );
  expect(
    (await (await page.request.get("/api/pages/" + created.id)).json()).slug,
  ).toBe(wanted);
  await page.reload();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(address).toHaveValue(wanted);
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Saved",
  );
});

test("an invalidated source device copy is retained without restoring its cached draft", async ({
  page,
  context,
}) => {
  const created = await fixture(page);
  await page.route("**/api/pages/*", (route) =>
    route.request().method() === "PATCH"
      ? route.abort("internetdisconnected")
      : route.continue(),
  );
  await editText(page, "Cached draft must not be restored");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  const recipient = await context.newPage();
  await recipient.goto("/admin/pages/" + created.id);
  const recover = recipient.getByRole("button", {
    name: "Recover device copy",
    exact: true,
  });
  await expect(recover).toBeVisible();
  const sourceKey = await page.evaluate((id) => {
    const key = Object.keys(localStorage).find(
      (key) => key.startsWith("garden-recovery:") && key.includes(id),
    )!;
    localStorage.setItem(key, '{"invalidated":"retain these bytes"}');
    return key;
  }, created.id);
  await recover.click();
  await expect(
    recipient.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  expect(
    await recipient.evaluate((key) => localStorage.getItem(key), sourceKey),
  ).toBe('{"invalidated":"retain these bytes"}');
  expect(
    (await (await recipient.request.get("/api/pages/" + created.id)).json())
      .content.content[0].props.text,
  ).not.toBe("Cached draft must not be restored");
});

for (const choice of ["mine", "saved"] as const)
  test(
    "recovered page address requires a " +
      choice +
      " choice after a remote change",
    async ({ page }, testInfo) => {
      const created = await fixture(page),
        path = "/api/pages/" + created.id + "/address";
      await page
        .getByRole("button", { name: "Page settings", exact: true })
        .click();
      await page.route("**/api/pages/*/address", (route) =>
        route.abort("internetdisconnected"),
      );
      const wanted = "local-rosemary-" + Date.now(),
        remote = "remote-fern-" + Date.now();
      await page.getByLabel("Page address", { exact: true }).fill(wanted);
      await expect(
        page.getByRole("status", { name: "Address status" }),
      ).toHaveText("Not saved");
      expect(
        (
          await page.request.patch(path, {
            headers: { Origin: env.NEXT_PUBLIC_APP_URL },
            data: { slug: remote, expectedSlug: created.slug },
          })
        ).status(),
      ).toBe(200);
      await page.unroute("**/api/pages/*/address");
      await page.reload();
      await page
        .getByRole("button", { name: "Page settings", exact: true })
        .click();
      await expect(
        page.getByRole("status", { name: "Address status" }),
      ).toHaveText("Address conflict · unsaved");
      await expect(
        page.getByLabel("Page address", { exact: true }),
      ).toHaveValue(wanted);
      await expect(
        page.getByText(
          "The saved address is /garden/" +
            remote +
            ". Your unsaved address is /garden/" +
            wanted +
            ".",
        ),
      ).toBeVisible();
      expect(
        (await (await page.request.get("/api/pages/" + created.id)).json())
          .slug,
      ).toBe(remote);
      await page
        .locator(".page-address")
        .screenshot({ path: testInfo.outputPath("address-conflict.png") });
      await page
        .getByRole("button", {
          name: choice === "mine" ? "Keep my address" : "Use saved address",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("status", { name: "Address status" }),
      ).toHaveText("Saved");
      expect(
        (await (await page.request.get("/api/pages/" + created.id)).json())
          .slug,
      ).toBe(choice === "mine" ? wanted : remote);
      expect(
        await page.evaluate(
          (id) =>
            Object.keys(localStorage).filter((key) =>
              key.includes(id + ":address:"),
            ),
          created.id,
        ),
      ).toEqual([]);
    },
  );

test("address recovery recognizes a lost acknowledgement without another write", async ({
  page,
}) => {
  const created = await fixture(page),
    wanted = "already-saved-rosemary-" + Date.now();
  let writes = 0;
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await page.route("**/api/pages/*/address", async (route) => {
    writes++;
    expect((await route.fetch()).status()).toBe(200);
    await route.abort("internetdisconnected");
  });
  await page.getByLabel("Page address", { exact: true }).fill(wanted);
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Not saved",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(page.getByLabel("Page address", { exact: true })).toHaveValue(
    wanted,
  );
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Saved",
  );
  expect(writes).toBe(1);
  expect(
    await page.evaluate(
      (id) =>
        Object.keys(localStorage).filter((key) =>
          key.includes(id + ":address:"),
        ),
      created.id,
    ),
  ).toEqual([]);
});

test("an older address acknowledgement cannot clear newer unfinished input", async ({
  page,
}) => {
  const created = await fixture(page),
    first = "first-address-" + Date.now();
  let release!: () => void,
    entered!: () => void,
    initial = true;
  const gate = new Promise<void>((resolve) => (release = resolve)),
    started = new Promise<void>((resolve) => (entered = resolve));
  await page.route("**/api/pages/*/address", async (route) => {
    if (!initial) return route.abort("internetdisconnected");
    initial = false;
    const response = await route.fetch();
    entered();
    await gate;
    await route.fulfill({ response });
  });
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await page.getByLabel("Page address", { exact: true }).fill(first);
  await started;
  await page
    .getByLabel("Page address", { exact: true })
    .fill("new unfinished address-");
  release();
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Not saved",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(page.getByLabel("Page address", { exact: true })).toHaveValue(
    "new unfinished address-",
  );
  expect(
    (await (await page.request.get("/api/pages/" + created.id)).json()).slug,
  ).toBe(first);
});

test("closed-tab address copies stay account scoped and clear on sign-out before late responses", async ({
  page,
  context,
  browser,
}) => {
  const created = await fixture(page),
    wanted = "closed-tab-address-" + Date.now();
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await page.route("**/api/pages/*/address", (route) =>
    route.abort("internetdisconnected"),
  );
  await page.getByLabel("Page address", { exact: true }).fill(wanted);
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Not saved",
  );
  const addressCopies = await page.evaluate(() =>
    Object.entries(localStorage).filter(([key]) => key.includes(":address:")),
  );
  const otherContext = await browser.newContext(),
    other = await otherContext.newPage();
  await otherContext.addInitScript((copies) => {
    for (const [key, value] of copies) localStorage.setItem(key, value);
  }, addressCopies);
  await login(other, "OTHER");
  await other.goto(env.NEXT_PUBLIC_APP_URL + "/admin/pages/" + created.id);
  await other
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await expect(other.getByLabel("Page address", { exact: true })).toHaveValue(
    created.slug,
  );
  await expect(
    other.getByRole("button", {
      name: "Recover address device copy",
      exact: true,
    }),
  ).toHaveCount(0);
  await otherContext.close();
  await page.close();
  const recipient = await context.newPage();
  await recipient.goto("/admin/pages/" + created.id);
  await recipient
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve)),
    started = new Promise<void>((resolve) => (entered = resolve));
  await recipient.route("**/api/pages/*/address", async (route) => {
    const response = await route.fetch();
    entered();
    await gate;
    try {
      await route.fulfill({ response });
    } catch {}
  });
  await recipient
    .getByRole("button", { name: "Recover address device copy", exact: true })
    .click();
  await expect(
    recipient.getByLabel("Page address", { exact: true }),
  ).toHaveValue(wanted);
  await started;
  await recipient
    .getByLabel("Page address", { exact: true })
    .fill("new private unfinished address-");
  const signout = await context.newPage();
  await signout.goto("/admin/pages");
  const menu = signout.getByLabel("Open administration menu");
  if (await menu.isVisible()) await menu.click();
  await signout.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(signout).toHaveURL(/\/login$/);
  release();
  await expect(recipient).toHaveURL(/\/login$/);
  await signout.reload();
  expect(
    await signout.evaluate(() =>
      Object.keys(localStorage).filter((key) =>
        key.startsWith("garden-recovery:"),
      ),
    ),
  ).toEqual([]);
});
