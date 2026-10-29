import { test, expect, type Locator } from "@playwright/test";
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
test("compose nested blocks with taps, retain selection through moves and save independent copies", async ({
  page,
  isMobile,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  async function press(control: Locator) {
    if (isMobile) await control.tap();
    else await control.click();
  }
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await press(page.getByRole("button", { name: "Sign in", exact: true }));
  await expect(page).toHaveURL(/\/admin\/pages$/);
  await press(page.getByRole("button", { name: "Create page", exact: true }));
  await page
    .getByLabel("Page title", { exact: true })
    .fill("Nested moments " + Date.now());
  await press(page.getByRole("button", { name: "Create private page" }));
  await expect(page).toHaveURL(/\/admin\/pages\/[\w-]+$/);
  await press(page.getByRole("button", { name: "Open content panel" }));
  await press(page.getByRole("button", { name: "Add Section", exact: true }));
  await page
    .getByLabel("Add to")
    .selectOption({ label: "Section 1 · content" });
  await press(page.getByRole("button", { name: "Add Columns", exact: true }));
  await page
    .getByLabel("Add to")
    .selectOption({ label: "Columns 1 · left column" });
  await press(page.getByRole("button", { name: "Add Text", exact: true }));
  await press(page.getByRole("button", { name: "Open settings panel" }));
  await page
    .getByRole("textbox", { name: "Text content", exact: true })
    .fill("First rosemary");
  await press(page.getByRole("button", { name: "Open content panel" }));
  await press(page.getByRole("button", { name: "Add Text", exact: true }));
  await press(page.getByRole("button", { name: "Open settings panel" }));
  await page
    .getByRole("textbox", { name: "Text content", exact: true })
    .fill("Second rosemary");
  await press(page.getByRole("button", { name: "Move block up", exact: true }));
  await expect(
    page.getByRole("textbox", { name: "Text content", exact: true }),
  ).toHaveValue("Second rosemary");
  await expect(
    page.getByRole("button", { name: "Move block up", exact: true }),
  ).toBeDisabled();
  await press(
    page.getByRole("button", { name: "Move block down", exact: true }),
  );
  await expect(
    page.getByRole("textbox", { name: "Text content", exact: true }),
  ).toHaveValue("Second rosemary");
  await press(page.getByRole("button", { name: "Open content panel" }));
  await page
    .getByLabel("Add to")
    .selectOption({ label: "Columns 1 · right column" });
  await press(page.getByRole("button", { name: "Add Banner", exact: true }));
  await press(page.getByRole("button", { name: "Open settings panel" }));
  await page
    .getByRole("textbox", { name: "Heading", exact: true })
    .fill("The right hand garden");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const id = page.url().split("/").pop();
  const saved = await (await page.request.get("/api/pages/" + id)).json();
  const section = saved.content.content.find(
    (b: { type: string }) => b.type === "Section",
  );
  expect(
    section.props.content[0].props.left.map(
      (b: { props: { text: string } }) => b.props.text,
    ),
  ).toEqual(["First rosemary", "Second rosemary"]);
  expect(section.props.content[0].props.right[0].props.heading).toBe(
    "The right hand garden",
  );
  await page.reload();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await press(page.getByRole("button", { name: "Open content panel" }));
  await press(
    page.getByRole("button", { name: "Select Section 1", exact: true }),
  );
  await press(page.getByRole("button", { name: "Open settings panel" }));
  await press(
    page.getByRole("button", { name: "Duplicate block", exact: true }),
  );
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const copied = await (await page.request.get("/api/pages/" + id)).json();
  const sections = copied.content.content.filter(
    (b: { type: string }) => b.type === "Section",
  );
  expect(sections).toHaveLength(2);
  expect(sections[0].props.content[0].props.left[0].props.id).not.toBe(
    sections[1].props.content[0].props.left[0].props.id,
  );
  await press(page.getByRole("button", { name: "Remove block", exact: true }));
  await expect(
    page.getByRole("heading", { name: "Page settings", exact: true }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.reload();
  const removed = await (await page.request.get("/api/pages/" + id)).json();
  expect(
    removed.content.content.filter(
      (b: { type: string }) => b.type === "Section",
    ),
  ).toHaveLength(1);
});

test("templates start independently and the device controls resize the actual responsive canvas", async ({
  page,
  isMobile,
}, testInfo) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  await page.getByRole("button", { name: "Create page", exact: true }).click();
  await page
    .getByLabel("Page title", { exact: true })
    .fill("Story canvas " + Date.now());
  await page.getByLabel("Start from a template").selectOption("story");
  await page.getByRole("button", { name: "Create private page" }).click();
  await expect(page).toHaveURL(/\/admin\/pages\/[\w-]+$/);
  const id = page.url().split("/").pop();
  const first = await (await page.request.get("/api/pages/" + id)).json();
  await page
    .getByRole("button", { name: "Select Banner 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await page
    .getByRole("textbox", { name: "Heading", exact: true })
    .fill("Our independent welcome");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const second = await (
    await page.request.post("/api/pages", {
      data: { title: "Another story " + Date.now(), template: "story" },
      headers: { Origin: new URL(page.url()).origin },
    })
  ).json();
  expect(second.content.content[0].props.heading).toBe(
    "The moments we grow together",
  );
  expect(second.content.content[0].props.id).not.toBe(
    first.content.content[0].props.id,
  );
  expect(
    second.content.content[1].props.content[0].props.left[0].props.id,
  ).not.toBe(first.content.content[1].props.content[0].props.left[0].props.id);
  const frame = page.frameLocator("iframe");
  await page.getByRole("button", { name: "Mobile", exact: true }).click();
  await expect
    .poll(() => frame.locator("body").evaluate((el) => el.clientWidth))
    .toBe(390);
  await expect
    .poll(() =>
      frame
        .locator(".garden-columns")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        ),
    )
    .toBe(1);
  await page.getByRole("button", { name: "Desktop", exact: true }).click();
  await expect
    .poll(() => frame.locator("body").evaluate((el) => el.clientWidth))
    .toBe(1280);
  await expect
    .poll(() =>
      frame
        .locator(".garden-columns")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        ),
    )
    .toBe(2);
  expect(
    await page
      .getByRole("button", { name: /^(Save|Publish|Preview|Undo|Redo)$/i })
      .count(),
  ).toBe(0);
  expect(
    await page
      .getByRole("navigation", { name: "Administration", exact: true })
      .count(),
  ).toBe(0);
  if (isMobile)
    await page.getByRole("button", { name: "Mobile", exact: true }).tap();
  await page.screenshot({
    path: testInfo.outputPath("editor.png"),
    fullPage: true,
  });
});

test("autosave keeps the latest edit during a slow write and preserves failures for retry", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  await page.getByRole("button", { name: "Create page", exact: true }).click();
  await page
    .getByLabel("Page title", { exact: true })
    .fill("Saving rosemary " + Date.now());
  await page.getByRole("button", { name: "Create private page" }).click();
  await expect(page).toHaveURL(/\/admin\/pages\/[\w-]+$/);
  await page
    .getByRole("button", { name: "Select Text 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  const field = page.getByRole("textbox", {
    name: "Text content",
    exact: true,
  });
  let release!: () => void, arrived!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve)),
    started = new Promise<void>((resolve) => (arrived = resolve));
  let delayed = false;
  await page.route("**/api/pages/*", async (route) => {
    if (route.request().method() === "PATCH" && !delayed) {
      delayed = true;
      arrived();
      await held;
    }
    await route.continue();
  });
  await field.fill("First slow save");
  await started;
  await field.fill("The latest rosemary survives");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saving…");
  release();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.unroute("**/api/pages/*");
  await page.reload();
  await page
    .getByRole("button", { name: "Select Text 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await expect(field).toHaveValue("The latest rosemary survives");
  await page.route("**/api/pages/*", async (route) => {
    if (route.request().method() === "PATCH") await route.abort("failed");
    else await route.continue();
  });
  await field.fill("A retryable garden memory");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Not saved");
  await expect(field).toHaveValue("A retryable garden memory");
  await page.unroute("**/api/pages/*");
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await page.reload();
  await page
    .getByRole("button", { name: "Select Text 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await expect(field).toHaveValue("A retryable garden memory");
});

test("drag a nested text block into an empty column and persist its new location", async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Mobile uses the verified tap and sibling move controls.",
  );
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  await page.getByRole("button", { name: "Create page", exact: true }).click();
  await page
    .getByLabel("Page title", { exact: true })
    .fill("A movable moment " + Date.now());
  await page.getByRole("button", { name: "Create private page" }).click();
  await expect(page).toHaveURL(/\/admin\/pages\/[\w-]+$/);
  await page.getByRole("button", { name: "Add Columns", exact: true }).click();
  await page
    .getByLabel("Add to")
    .selectOption({ label: "Columns 1 · left column" });
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  const frame = page.frameLocator("iframe");
  const source = frame
    .locator(".garden-columns > div")
    .first()
    .getByRole("button", { name: "Write a little memory…", exact: true });
  const destination = frame.locator(".garden-columns > div").nth(1);
  const from = await source.boundingBox(),
    to = await destination.boundingBox();
  expect(from).toBeTruthy();
  expect(to).toBeTruthy();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    from!.x + from!.width / 2 + 12,
    from!.y + from!.height / 2,
    { steps: 5 },
  );
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, {
    steps: 30,
  });
  await page.mouse.up();
  await expect(
    destination.getByText("Write a little memory…", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const id = page.url().split("/").pop();
  const saved = await (await page.request.get("/api/pages/" + id)).json();
  expect(
    saved.content.content.find(
      (block: { type: string }) => block.type === "Columns",
    ).props.left,
  ).toHaveLength(0);
  expect(
    saved.content.content.find(
      (block: { type: string }) => block.type === "Columns",
    ).props.right[0].props.text,
  ).toBe("Write a little memory…");
  await page.reload();
  await expect(
    frame
      .locator(".garden-columns > div")
      .nth(1)
      .getByText("Write a little memory…", { exact: true }),
  ).toBeVisible();
});

test("image and button settings appear through the same public blocks after autosave", async ({
  page,
  browser,
  baseURL,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(env.TEST_ADMIN_EMAIL);
  await page
    .getByLabel("Password", { exact: true })
    .fill(env.TEST_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/pages$/);
  await page.getByRole("button", { name: "Create page", exact: true }).click();
  await page
    .getByLabel("Page title", { exact: true })
    .fill("Our photo journal " + Date.now());
  await page.getByLabel("Start from a template").selectOption("journal");
  await page.getByRole("button", { name: "Create private page" }).click();
  await expect(page).toHaveURL(/\/admin\/pages\/[\w-]+$/);
  await page
    .getByRole("button", { name: "Select Image 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await page
    .getByRole("textbox", { name: "Alternative text", exact: true })
    .fill("Rosemary leaves in the morning");
  await page
    .getByRole("textbox", { name: "Caption", exact: true })
    .fill("Our first spring");
  await page
    .getByRole("combobox", { name: "Photo width", exact: true })
    .selectOption({ label: "Full width" });
  await page
    .getByRole("combobox", { name: "Photo fit", exact: true })
    .selectOption({ label: "Contain" });
  await page.getByRole("button", { name: "Open content panel" }).click();
  await page.getByLabel("Add to").selectOption({ label: "Page" });
  await page.getByRole("button", { name: "Add Button", exact: true }).click();
  await page.getByRole("button", { name: "Open settings panel" }).click();
  await page
    .getByRole("textbox", { name: "Button label", exact: true })
    .fill("Read our journal");
  await page
    .getByRole("textbox", { name: "External web address", exact: true })
    .fill("https://example.com/garden");
  await page
    .getByRole("combobox", { name: "Appearance", exact: true })
    .selectOption({ label: "Secondary" });
  await page
    .getByRole("combobox", { name: "Alignment", exact: true })
    .selectOption({ label: "Centre" });
  await page.getByLabel("Page visibility").selectOption("public");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto(baseURL + "/p/" + page.url().split("/").pop());
  await expect(
    publicPage.getByRole("img", { name: "Rosemary leaves in the morning" }),
  ).toBeVisible();
  await expect(
    publicPage.getByText("Our first spring", { exact: true }),
  ).toBeVisible();
  await expect(
    publicPage.getByRole("link", { name: "Read our journal", exact: true }),
  ).toHaveAttribute("href", "https://example.com/garden");
  const image = publicPage.locator(".garden-image-full");
  await expect
    .poll(() =>
      image.evaluate((el) => Math.round(el.getBoundingClientRect().width)),
    )
    .toBe(publicPage.viewportSize()!.width);
  await visitor.close();
});
