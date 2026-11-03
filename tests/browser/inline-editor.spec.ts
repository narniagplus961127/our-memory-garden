import { test, expect, type Page } from "@playwright/test";
import {
  selectBlock,
  chooseAddTarget,
  writeCanvas,
  legacyTextContent,
} from "./editor-controls";
import { readFile } from "node:fs/promises";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);

test("write and format directly on the canvas, autosave, reload and render the public page", async ({
  page,
  browser,
  baseURL,
  isMobile,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  const created = await page.request.post("/api/pages", {
    headers: { Origin: baseURL! },
    data: { title: "Inline garden " + Date.now() },
  });
  expect(created.ok()).toBeTruthy();
  const garden = await created.json();
  garden.content = legacyTextContent();
  // Preserve older documents that used one padding value when side overrides reset.
  garden.content.content[0].props.padding = 30;
  expect(
    (
      await page.request.patch("/api/pages/" + garden.id, {
        headers: { Origin: baseURL! },
        data: { content: garden.content, version: garden.version },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/admin/pages/" + garden.id);
  const text = page
    .frameLocator("iframe")
    .locator('.garden-text [contenteditable="true"]');
  await expect(text).toBeVisible();
  await text.click();
  await text.fill("A memory written in our garden");
  if (isMobile)
    await text.evaluate((el) => {
      // Mobile emulation has no OS selection menu; create the same visible text range.
      const range = el.ownerDocument.createRange();
      range.selectNodeContents(el);
      const selection = el.ownerDocument.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  else await text.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(text.locator("strong")).toHaveText(
    "A memory written in our garden",
  );
  // Switch straight from a size edit into the colour dialog without pressing Enter.
  await page
    .getByRole("spinbutton", { name: "Font size", exact: true })
    .fill("28");
  await page.getByRole("button", { name: "Text colour", exact: true }).click();
  await page.getByLabel("Custom hex colour", { exact: true }).fill("#a75b43");
  await page.getByRole("button", { name: "Apply colour", exact: true }).click();
  await expect(text.locator("span")).toHaveCSS("font-size", "28px");
  await expect(text.locator("span")).toHaveCSS("color", "rgb(167, 91, 67)");
  await page
    .getByRole("combobox", { name: "Font family", exact: true })
    .selectOption("Georgia");
  await expect(text.locator("span")).toHaveCSS("font-family", "Georgia");
  await page
    .getByRole("button", { name: "More text formatting", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "Letter spacing", exact: true })
    .fill("1.5");
  await page
    .getByRole("spinbutton", { name: "Letter spacing", exact: true })
    .press("Enter");
  if (
    !(await page
      .getByRole("region", { name: "More text formatting", exact: true })
      .isVisible())
  )
    await page
      .getByRole("button", { name: "More text formatting", exact: true })
      .click();
  await page
    .getByRole("spinbutton", { name: "Line height", exact: true })
    .fill("1.8");
  await page
    .getByRole("spinbutton", { name: "Line height", exact: true })
    .press("Enter");
  await expect(text.locator("span")).toHaveCSS("line-height", "50.4px");
  if (
    await page
      .getByRole("region", { name: "More text formatting", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Close more formatting", exact: true })
      .click();
  await expect(text.locator("span")).toHaveCSS("letter-spacing", "1.5px");
  await page
    .getByRole("spinbutton", { name: "Font size", exact: true })
    .fill("64");
  await page
    .getByRole("spinbutton", { name: "Font size", exact: true })
    .press("Escape");
  await expect(text.locator("span")).toHaveCSS("font-size", "28px");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page
    .getByRole("spinbutton", { name: "Padding top", exact: true })
    .fill("12");
  await page
    .getByRole("button", { name: "Reset padding", exact: true })
    .click();
  await expect(page.frameLocator("iframe").locator(".garden-text")).toHaveCSS(
    "padding",
    "30px",
  );
  for (const [name, value] of Object.entries({
    "Padding top": "12",
    "Padding right": "16",
    "Padding bottom": "20",
    "Padding left": "24",
    "Margin top": "4",
    "Margin right": "8",
    "Margin bottom": "12",
    "Margin left": "16",
  }))
    await page.getByRole("spinbutton", { name, exact: true }).fill(value);
  if (isMobile)
    await page
      .getByRole("button", { name: "Close panel", exact: true })
      .click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.reload();
  await expect(text.locator("strong")).toHaveText(
    "A memory written in our garden",
  );
  await expect(text.locator("span")).toHaveCSS("font-size", "28px");
  await expect(text.locator("span")).toHaveCSS("letter-spacing", "1.5px");
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await page
    .getByLabel("Page visibility", { exact: true })
    .selectOption("public");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const visitor = await browser.newContext();
  const view = await visitor.newPage();
  await view.goto(baseURL + "/p/" + garden.id);
  await expect(view.locator(".garden-text strong")).toHaveText(
    "A memory written in our garden",
  );
  await expect(view.locator(".garden-text span")).toHaveCSS(
    "color",
    "rgb(167, 91, 67)",
  );
  await expect(view.locator(".garden-text span")).toHaveCSS(
    "font-size",
    "28px",
  );
  await expect(view.locator(".garden-text span")).toHaveCSS(
    "letter-spacing",
    "1.5px",
  );
  await expect(view.locator(".garden-text span")).toHaveCSS(
    "font-family",
    "Georgia",
  );
  await expect(view.locator(".garden-text span")).toHaveCSS(
    "line-height",
    "50.4px",
  );
  await expect(view.locator(".garden-text")).toHaveCSS(
    "padding",
    "12px 16px 20px 24px",
  );
  await expect(view.locator(".garden-text")).toHaveCSS(
    "margin",
    "4px 8px 12px 16px",
  );
  await visitor.close();
});

async function fixture(page: Page, content: unknown = legacyTextContent()) {
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
    ).ok(),
  ).toBeTruthy();
  let garden = await (
    await page.request.post("/api/pages", {
      headers: { Origin: origin },
      data: { title: "Editor interaction " + Date.now() },
    })
  ).json();
  if (content)
    garden = await (
      await page.request.patch("/api/pages/" + garden.id, {
        headers: { Origin: origin },
        data: { content, version: garden.version },
      })
    ).json();
  await page.goto("/admin/pages/" + garden.id);
  return garden;
}

test("save acknowledgements retain the active caret during composition", async ({
  page,
}) => {
  const garden = await fixture(page);
  const text = page
    .frameLocator("iframe")
    .locator('.garden-text [contenteditable="true"]');
  await text.click();
  await text.fill("Our garden ");
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const arrived = new Promise<void>((resolve) => {
    started = resolve;
  });
  let first = true;
  await page.route("**/api/pages/" + garden.id, async (route) => {
    if (route.request().method() === "PATCH" && first) {
      first = false;
      started();
      await held;
    }
    await route.continue();
  });
  await text.press("End");
  await page.keyboard.insertText("grows ");
  await arrived;
  await text.dispatchEvent("compositionstart", { data: "" });
  await page.keyboard.insertText("花");
  release();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await expect(text).toBeFocused();
  expect(
    await text.evaluate((element) => {
      const selection = element.ownerDocument.getSelection();
      return selection?.isCollapsed && element.contains(selection.anchorNode);
    }),
  ).toBe(true);
  await text.dispatchEvent("compositionend", { data: "花" });
  await page.keyboard.insertText(" together");
  await expect(text).toHaveText("Our garden grows 花 together");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.reload();
  await expect(text).toHaveText("Our garden grows 花 together");
});

test("custom colours, preserved column contents and page settings work with touch alternatives", async ({
  page,
  isMobile,
}, testInfo) => {
  await fixture(page);
  await page
    .getByRole("button", { name: "Open content panel", exact: true })
    .click();
  await page.getByRole("button", { name: "Add Section", exact: true }).click();
  await page
    .getByRole("button", { name: "Open content panel", exact: true })
    .click();
  await page.getByRole("button", { name: "Add Columns", exact: true }).click();
  await page.getByRole("button", { name: "3 columns", exact: true }).click();
  await page.getByRole("button", { name: "Apply layout", exact: true }).click();
  await chooseAddTarget(page, "Columns 1 · third column");
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  await expect(
    page
      .frameLocator("iframe")
      .locator(".garden-columns > div")
      .nth(2)
      .getByRole("textbox", { name: "Text content", exact: true }),
  ).toBeVisible();
  await writeCanvas(page, "Text content", "A memory in the third column");
  await selectBlock(page, "Select Columns 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Change column layout", exact: true })
    .click();
  await page.getByRole("button", { name: "1 column", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Contents of removed columns" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Apply layout", exact: true }).click();
  await selectBlock(page, "Select Text 2");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  const colour = page.getByLabel("Custom background hex colour", {
    exact: true,
  });
  await colour.fill("#7ad");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const id = page.url().split("/").pop();
  let saved = await (await page.request.get("/api/pages/" + id)).json();
  const columns = saved.content.content
    .find((b: { type: string }) => b.type === "Section")
    .props.content.find((b: { type: string }) => b.type === "Columns");
  expect(columns.props.count).toBe(1);
  expect(columns.props.left[0].props.text).toBe("A memory in the third column");
  expect(columns.props.left[0].props.backgroundColor).toBe("#77aadd");
  await colour.fill("");
  await colour.pressSequentially("#a7c4a0");
  await expect(colour).toHaveValue("#a7c4a0");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  expect(
    (await (await page.request.get("/api/pages/" + id)).json()).content.content
      .find((b: { type: string }) => b.type === "Section")
      .props.content.find((b: { type: string }) => b.type === "Columns").props
      .left[0].props.backgroundColor,
  ).toBe("#a7c4a0");
  await colour.fill("#7ad");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await colour.fill("#nope");
  await expect(colour).toHaveValue("#nope");
  await expect(
    page.getByText("Enter a hex colour such as #A7C4A0.", { exact: true }),
  ).toBeVisible();
  expect(
    (await (await page.request.get("/api/pages/" + id)).json()).content.content
      .find((b: { type: string }) => b.type === "Section")
      .props.content.find((b: { type: string }) => b.type === "Columns").props
      .left[0].props.backgroundColor,
  ).toBe("#77aadd");
  await page
    .getByLabel("Move to", { exact: true })
    .selectOption({ label: "Section 1 · content" });
  await page
    .getByLabel("Position", { exact: true })
    .selectOption({ label: "At the end" });
  await page
    .getByRole("button", { name: "Move block here", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  saved = await (await page.request.get("/api/pages/" + id)).json();
  expect(
    saved.content.content
      .find((b: { type: string }) => b.type === "Section")
      .props.content.at(-1).props.text,
  ).toBe("A memory in the third column");
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await page
    .getByLabel("Page settings title", { exact: true })
    .fill("A renamed garden page");
  await page.getByLabel("Page address", { exact: true }).fill("inline-" + id);
  await page.getByLabel("Page address", { exact: true }).press("Tab");
  await expect(page.getByRole("status", { name: "Address status" })).toHaveText(
    "Saved",
  );
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  if (isMobile)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(page.viewportSize()!.width);
  await page.screenshot({
    path: testInfo.outputPath("page-settings.png"),
    fullPage: false,
  });
  await page.getByRole("link", { name: "← Pages", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  await page.locator('a[href="/admin/pages/' + id + '"]').click();
  await expect(page.getByLabel("Page title", { exact: true })).toHaveValue(
    "A renamed garden page",
  );
  await expect(
    page.getByRole("link", {
      name: "View page (opens in a new tab)",
      exact: true,
    }),
  ).toHaveAttribute("href", "/p/" + id);
  await expect(
    page.getByRole("link", { name: "Dashboard", exact: true }),
  ).toHaveCount(0);
});

test("choosing the saved column layout retains children added in a removed column", async ({
  page,
}) => {
  const text = (id: string, value: string) => ({
    type: "Text",
    props: { id, text: value, style: "p" },
  });
  const garden = await fixture(page, {
    root: { props: {} },
    content: [
      {
        type: "Columns",
        props: {
          id: "columns",
          count: 4,
          ratio: "equal",
          left: [text("first", "First path")],
          right: [],
          third: [text("third", "Third path")],
          fourth: [],
        },
      },
    ],
  });
  const origin = env.NEXT_PUBLIC_APP_URL;
  const latest = await (
    await page.request.get("/api/pages/" + garden.id)
  ).json();
  latest.content.content[0].props.third.push(
    text("new", "Another gardener's memory"),
  );
  expect(
    (
      await page.request.patch("/api/pages/" + garden.id, {
        headers: { Origin: origin },
        data: { version: latest.version, content: latest.content },
      })
    ).ok(),
  ).toBeTruthy();
  await selectBlock(page, "Select Columns 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Change column layout", exact: true })
    .click();
  await page.getByRole("button", { name: "1 column", exact: true }).click();
  await page.getByRole("button", { name: "Apply layout", exact: true }).click();
  const comparison = page.getByRole("region", {
    name: "Resolve editing conflicts",
  });
  await expect(comparison).toBeVisible();
  await comparison
    .getByRole("button", { name: "Use saved layout", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const saved = await (
    await page.request.get("/api/pages/" + garden.id)
  ).json();
  expect(saved.content.content[0].props.count).toBe(4);
  expect(
    saved.content.content[0].props.third.map(
      (block: { props: { text: string } }) => block.props.text,
    ),
  ).toEqual(["Third path", "Another gardener's memory"]);
});

test("formatting-only conflicts show both formatted versions before a choice", async ({
  page,
}) => {
  const garden = await fixture(page, {
    root: { props: {} },
    content: [
      {
        type: "Text",
        props: {
          id: "format",
          text: "Our memory",
          style: "p",
          textRich: "<p>Our memory</p>",
        },
      },
    ],
  });
  const latest = await (
    await page.request.get("/api/pages/" + garden.id)
  ).json();
  latest.content.content[0].props.textRich =
    "<p><strong>Our memory</strong></p>";
  expect(
    (
      await page.request.patch("/api/pages/" + garden.id, {
        headers: { Origin: env.NEXT_PUBLIC_APP_URL },
        data: { version: latest.version, content: latest.content },
      })
    ).ok(),
  ).toBeTruthy();
  const field = page
    .frameLocator("iframe")
    .getByRole("textbox", { name: "Text content", exact: true });
  await field.click();
  await field.evaluate((element) => {
    const range = element.ownerDocument.createRange();
    range.selectNodeContents(element);
    const selection = element.ownerDocument.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page
    .getByRole("button", { name: "More text formatting", exact: true })
    .click();
  await page.getByRole("button", { name: "Italic", exact: true }).click();
  const comparison = page.getByRole("region", {
    name: "Resolve editing conflicts",
  });
  await expect(comparison).toBeVisible();
  await expect(
    comparison.locator('[aria-label="Your formatting and links"] em'),
  ).toHaveText("Our memory");
  await expect(
    comparison
      .locator('[aria-label="Saved formatting and links"] strong')
      .last(),
  ).toHaveText("Our memory");
  await comparison
    .getByRole("button", { name: "Use saved version", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
});
