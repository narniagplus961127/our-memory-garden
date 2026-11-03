import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { selectBlock, chooseAddTarget, addColumns } from "./editor-controls";
const env = Object.fromEntries(
  (await readFile(".env.test", "utf8"))
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const headers = { Origin: env.NEXT_PUBLIC_APP_URL };
async function saved(page: Page) {
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
}
async function fixture(page: Page) {
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
  const garden = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Section garden " + Date.now() },
    })
  ).json();
  expect(garden.content.content).toEqual([]);
  await page.goto("/admin/pages/" + garden.id);
  await page
    .getByRole("button", { name: "Open content panel", exact: true })
    .click();
  return garden;
}
test("sections contain new blocks and columns; styles persist without losing the nested caret", async ({
  page,
  isMobile,
}, testInfo) => {
  const garden = await fixture(page);
  await expect(
    page.getByRole("button", { name: "Add Text", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Add Columns", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText(
      "Add a section first, then place blocks or columns inside it.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add Section", exact: true }).click();
  await chooseAddTarget(page, "Section 1 · content");
  await addColumns(page);
  await chooseAddTarget(page, "Columns 1 · left column");
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  if (
    isMobile &&
    (await page
      .getByRole("button", { name: "Close panel", exact: true })
      .isVisible())
  )
    await page
      .getByRole("button", { name: "Close panel", exact: true })
      .click();
  const frame = page.frameLocator("iframe"),
    text = frame.getByRole("textbox", { name: "Text content", exact: true });
  await text.click();
  await text.fill("");
  await text.pressSequentially("Our memories grow together", { delay: 40 });
  await expect(text).toBeFocused();
  await expect(text).toHaveText("Our memories grow together");
  await saved(page);
  await selectBlock(page, "Select Text 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await expect(
    page.getByLabel("Move to", { exact: true }).locator("option"),
  ).not.toContainText(["Page"]);
  await selectBlock(page, "Select Section 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Content background", exact: true })
    .getByRole("button", { name: "Custom", exact: true })
    .click();
  await page.getByLabel("Content colour hex", { exact: true }).fill("#fff1df");
  await page
    .getByLabel("Custom background hex colour", { exact: true })
    .fill("#c8ddce");
  await page.getByLabel("Border width · px", { exact: true }).fill("2");
  await page.getByLabel("Border colour hex", { exact: true }).fill("#304337");
  await page.getByLabel("Padding top", { exact: true }).fill("20");
  await page.getByLabel("Padding right", { exact: true }).fill("10");
  await page.getByLabel("Padding bottom", { exact: true }).fill("24");
  await page.getByLabel("Padding left", { exact: true }).fill("10");
  await page
    .getByRole("group", { name: "Column content alignment", exact: true })
    .getByRole("button", { name: "Bottom", exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "Column content alignment", exact: true })
      .getByRole("button", { name: "Bottom", exact: true }),
  ).toHaveCSS("color", "rgb(48, 67, 55)");
  await saved(page);
  await page
    .getByRole("complementary", { name: "Block styles", exact: true })
    .evaluate((el) => (el.scrollTop = 0));
  await page.screenshot({
    path: testInfo.outputPath("section-settings.png"),
    fullPage: false,
  });
  let state = await (await page.request.get("/api/pages/" + garden.id)).json();
  expect(state.content.content.map((b: { type: string }) => b.type)).toEqual([
    "Section",
  ]);
  expect(state.content.content[0].props).toMatchObject({
    contentBackground: { mode: "custom", colour: "#fff1df" },
    backgroundColor: "#c8ddce",
    borderWidth: 2,
    borderColor: "#304337",
    paddingSides: { top: 20, right: 10, bottom: 24, left: 10 },
    columnAlignment: "bottom",
  });
  expect(state.content.content[0].props.content[0].type).toBe("Columns");
  expect(
    state.content.content[0].props.content[0].props.left[0].props.text,
  ).toBe("Our memories grow together");
  await page.reload();
  await expect(frame.locator(".garden-section")).toHaveCSS(
    "border-top-width",
    "2px",
  );
  await expect(frame.locator(".garden-section-content")).toHaveCSS(
    "background-color",
    "rgb(255, 241, 223)",
  );
  await expect(frame.locator(".garden-columns")).toHaveCSS(
    "align-items",
    "end",
  );
  await chooseAddTarget(page, "Columns 1 · left column");
  await page.getByRole("button", { name: "Add Section", exact: true }).click();
  await saved(page);
  state = await (await page.request.get("/api/pages/" + garden.id)).json();
  expect(state.content.content.map((b: { type: string }) => b.type)).toEqual([
    "Section",
    "Section",
  ]);
  await selectBlock(page, "Select Text 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page
    .getByLabel("Move to", { exact: true })
    .selectOption({ label: "Section 2 · content" });
  await page
    .getByRole("button", { name: "Move block here", exact: true })
    .click();
  await saved(page);
  state = await (await page.request.get("/api/pages/" + garden.id)).json();
  expect(state.content.content[0].props.content[0].props.left).toEqual([]);
  expect(state.content.content[1].props.content[0].props.text).toBe(
    "Our memories grow together",
  );
  expect(
    (
      await page.request.patch("/api/pages/" + garden.id, {
        headers,
        data: { version: state.version, visibility: "public" },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/p/" + garden.id);
  await expect(page.locator(".garden-section").first()).toHaveCSS(
    "padding-bottom",
    "24px",
  );
  await expect(page.locator(".garden-section-content").first()).toHaveCSS(
    "background-color",
    "rgb(255, 241, 223)",
  );
  await expect(page.locator(".garden-columns")).toHaveCSS("align-items", "end");
});

test("native dragging accepts blocks inside a section and rejects page-level blocks and nested sections", async ({
  page,
  isMobile,
}) => {
  test.skip(
    isMobile,
    "Touch placement is covered by Add and Move in the first test.",
  );
  await page.setViewportSize({ width: 1800, height: 1100 });
  const garden = await fixture(page);
  await page.getByRole("button", { name: "Add Section", exact: true }).click();
  await page
    .getByRole("button", { name: "Open content panel", exact: true })
    .click();
  const frame = page.frameLocator("iframe");
  async function drag(type: string, target: { x: number; y: number }) {
    await page
      .getByRole("button", { name: "Open content panel", exact: true })
      .click();
    const from = (await page.getByTestId("drawer-item:" + type).boundingBox())!;
    await page.mouse.move(from.x + 30, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 45, from.y + from.height / 2, { steps: 5 });
    await page.mouse.move(target.x, target.y, { steps: 30 });
    await page.mouse.up();
  }
  const section = (await frame.locator(".garden-section").boundingBox())!;
  await drag("Text", {
    x: section.x + section.width / 2,
    y: section.y + section.height / 2,
  });
  await expect(frame.locator(".garden-section .garden-text")).toHaveCount(1);
  await saved(page);
  const before = (
    await (await page.request.get("/api/pages/" + garden.id)).json()
  ).content;
  const root = (await frame.locator(".garden-document").boundingBox())!;
  await drag("Text", {
    x: root.x + root.width / 2,
    y: root.y + root.height - 8,
  });
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/pages/" + garden.id)).json())
          .content,
    )
    .toEqual(before);
  await drag("Section", {
    x: section.x + section.width / 2,
    y: section.y + section.height / 2,
  });
  await saved(page);
  const current = (
    await (await page.request.get("/api/pages/" + garden.id)).json()
  ).content;
  // Dropping a Section may snap to a valid page insertion point, but never nests it.
  expect(
    current.content.every((b: { type: string }) => b.type === "Section"),
  ).toBe(true);
  expect(
    current.content
      .flatMap(
        (b: { props: { content: { type: string }[] } }) => b.props.content,
      )
      .filter((b: { type: string }) => b.type === "Section"),
  ).toEqual([]);
});
