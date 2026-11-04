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
  const created = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Garden interface " + Date.now() },
    })
  ).json();
  const result = await page.request.patch("/api/pages/" + created.id, {
    headers,
    data: {
      version: created.version,
      visibility: "public",
      content: {
        root: { props: {} },
        content: [
          {
            type: "Section",
            props: {
              id: "section-ui",
              content: [
                {
                  type: "Text",
                  props: {
                    id: "text-ui",
                    text: "A memory to keep",
                    style: "p",
                  },
                },
                {
                  type: "Columns",
                  props: { id: "columns-ui", left: [], right: [] },
                },
              ],
            },
          },
        ],
      },
    },
  });
  expect(result.ok()).toBeTruthy();
  return result.json();
}

test("garden shortcuts open on hover or tap and only administrators see the current-page editor link", async ({
  page,
  isMobile,
  browser,
  baseURL,
}, testInfo) => {
  test.setTimeout(120000);
  const garden = await fixture(page);
  await page.goto("/garden/" + garden.slug);
  const trigger = page.getByRole("button", {
    name: "Garden tools",
    exact: true,
  });
  if (isMobile) await trigger.click();
  else await trigger.hover();
  const tools = page.getByRole("navigation", {
    name: "Garden shortcuts",
    exact: true,
  });
  await expect(
    tools.getByRole("link", { name: "Garden dashboard", exact: true }),
  ).toHaveAttribute("href", "/admin");
  await expect(
    tools.getByRole("link", { name: "Edit this page", exact: true }),
  ).toHaveAttribute("href", "/admin/pages/" + garden.id);
  await page.screenshot({ path: testInfo.outputPath("garden-tools.png") });
  await tools
    .getByRole("link", { name: "Edit this page", exact: true })
    .click();
  await expect(page).toHaveURL("/admin/pages/" + garden.id);
  await page.goto("/garden/" + garden.slug);
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(tools).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(tools).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.goto("/garden/no-such-garden-page");
  await trigger.click();
  await expect(
    page.getByRole("link", { name: "Edit this page", exact: true }),
  ).toHaveCount(0);
  const visitor = await browser.newContext();
  try {
    const pub = await visitor.newPage();
    await pub.goto(baseURL + "/garden/" + garden.slug);
    await pub
      .getByRole("button", { name: "Garden tools", exact: true })
      .click();
    await expect(
      pub.getByRole("link", { name: "Garden dashboard", exact: true }),
    ).toBeVisible();
    await expect(
      pub.getByRole("link", { name: "Edit this page", exact: true }),
    ).toHaveCount(0);
  } finally {
    await visitor.close();
  }
});

test("editor block deletion needs confirmation and shared modals use an icon close action", async ({
  page,
  isMobile,
}, testInfo) => {
  test.setTimeout(120000);
  const garden = await fixture(page);
  await page.goto("/admin/pages/" + garden.id);
  await selectBlock(page, "Select Section 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page.getByRole("button", { name: "Remove block", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Remove Section?",
    exact: true,
  });
  await expect(dialog).toContainText("2 nested block");
  await expect(dialog.getByRole("button", { name: /^Close / })).toContainText(
    "",
  );
  await expect(
    dialog.getByRole("button", { name: /^Close / }).locator("svg"),
  ).toHaveCount(1);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    (await (await page.request.get("/api/pages/" + garden.id)).json()).content
      .content,
  ).toHaveLength(1);
  await selectBlock(page, "Select Columns 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Change column layout", exact: true })
    .click();
  const chooser = page.getByRole("dialog", {
    name: "Choose your columns",
    exact: true,
  });
  await expect(
    chooser
      .getByRole("button", { name: "Close column chooser", exact: true })
      .locator("svg"),
  ).toHaveCount(1);
  const popupBox = (await chooser.boundingBox())!,
    closeBox = (await chooser
      .getByRole("button", { name: "Close column chooser", exact: true })
      .boundingBox())!;
  expect(closeBox.x).toBeGreaterThanOrEqual(popupBox.x + 16);
  expect(closeBox.x + closeBox.width).toBeLessThanOrEqual(
    popupBox.x + popupBox.width - 16,
  );
  await expect(
    chooser.getByRole("button", { name: "2 columns", exact: true }),
  ).toHaveCSS("color", "rgb(48, 67, 55)");
  await page.screenshot({
    path: testInfo.outputPath("shared-column-modal.png"),
  });
  await chooser
    .getByRole("button", { name: "Close column chooser", exact: true })
    .click();
  await selectBlock(page, "Select Text 1");
  if (
    isMobile &&
    (await page
      .getByRole("button", { name: "Close panel", exact: true })
      .isVisible())
  )
    await page
      .getByRole("button", { name: "Close panel", exact: true })
      .click();
  const canvasDelete = page.frameLocator("iframe").getByRole("button", {
    name: "Delete",
    exact: true,
  });
  await canvasDelete.click();
  const textDialog = page.getByRole("dialog", {
    name: "Remove Text?",
    exact: true,
  });
  await expect(textDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(textDialog).toHaveCount(0);
  await canvasDelete.click();
  await textDialog
    .getByRole("button", { name: "Remove block", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await expect
    .poll(async () =>
      (
        await (await page.request.get("/api/pages/" + garden.id)).json()
      ).content.content[0].props.content.map(
        (block: { type: string }) => block.type,
      ),
    )
    .toEqual(["Columns"]);
});
