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
async function saved(page: Page) {
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
}
async function sample(page: Page) {
  await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  const target = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Image destination " + Date.now() },
    })
  ).json();
  const source = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: "Linked photograph " + Date.now() },
    })
  ).json();
  expect(
    (
      await page.request.patch("/api/pages/" + source.id, {
        headers,
        data: {
          version: source.version,
          visibility: "public",
          content: {
            root: { props: {} },
            content: [
              {
                type: "Section",
                props: {
                  id: "link-section",
                  background: "paper",
                  spacing: "compact",
                  content: [
                    {
                      type: "Image",
                      props: {
                        id: "linked-image",
                        alt: "Adventure photograph",
                        width: "full",
                        caption: "A memory together",
                      },
                    },
                    {
                      type: "Text",
                      props: {
                        id: "aligned-text",
                        text: "A little moment",
                        style: "p",
                      },
                    },
                    {
                      type: "Button",
                      props: {
                        id: "aligned-button",
                        label: "Our adventures",
                        href: "https://example.com",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto("/admin/pages/" + source.id);
  return { source, target };
}

test("image links autosave, preserve editor controls, use stable page IDs and can be removed", async ({
  page,
  browser,
  baseURL,
}) => {
  const { source, target } = await sample(page);
  await selectBlock(page, "Select Image 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page
    .getByLabel("Destination type", { exact: true })
    .selectOption("external");
  await page
    .getByLabel("External web address", { exact: true })
    .fill("https://example.com/adventure");
  await saved(page);
  await expect(
    page.frameLocator("iframe").locator(".garden-image-link"),
  ).toHaveCount(0);
  await expect(
    page
      .frameLocator("iframe")
      .getByRole("button", { name: "Choose photo", exact: true }),
  ).toHaveCount(1);
  const visitor = await browser.newContext({ viewport: page.viewportSize()! }),
    view = await visitor.newPage();
  try {
    await view.goto(baseURL + "/p/" + source.id);
    await expect(
      view.getByRole("link", { name: "Adventure photograph", exact: true }),
    ).toHaveAttribute("href", "https://example.com/adventure");
    await page
      .getByLabel("Destination type", { exact: true })
      .selectOption("page");
    await page
      .getByLabel("Garden page", { exact: true })
      .selectOption(target.id);
    await saved(page);
    const refs = await (
      await page.request.get("/api/pages/" + target.id + "/trash")
    ).json();
    expect(
      refs.references.some(
        (ref: { id: string; kind: string }) =>
          ref.id === source.id && ref.kind.includes("image"),
      ),
    ).toBe(true);
    expect(
      (
        await page.request.patch("/api/pages/" + target.id + "/address", {
          headers,
          data: {
            slug: "photo-link-" + crypto.randomUUID(),
            expectedSlug: target.slug,
          },
        })
      ).ok(),
    ).toBeTruthy();
    await view.reload();
    await expect(
      view.getByRole("link", { name: "Adventure photograph", exact: true }),
    ).toHaveAttribute("href", "/p/" + target.id);
    expect((await view.goto(baseURL + "/p/" + target.id))!.status()).toBe(404);
    await page.reload();
    await selectBlock(page, "Select Image 1");
    await page
      .getByRole("button", { name: "Open settings panel", exact: true })
      .click();
    await expect(page.getByLabel("Garden page", { exact: true })).toHaveValue(
      target.id,
    );
    await page
      .getByLabel("Destination type", { exact: true })
      .selectOption("none");
    await saved(page);
    await view.goto(baseURL + "/p/" + source.id);
    await expect(view.locator(".garden-image-link")).toHaveCount(0);
    const current = await (
      await page.request.get("/api/pages/" + source.id)
    ).json();
    current.content.content[0].props.content[0].props.destination = {
      kind: "external",
      url: "javascript:alert(1)",
    };
    expect(
      (
        await page.request.patch("/api/pages/" + source.id, {
          headers,
          data: { content: current.content, version: current.version },
        })
      ).status(),
    ).toBe(400);
  } finally {
    await visitor.close();
  }
});

test("right alignment persists for blocks and inline paragraphs", async ({
  page,
  isMobile,
}) => {
  const { source } = await sample(page);
  await selectBlock(page, "Select Button 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page
    .getByLabel("Alignment", { exact: true })
    .selectOption({ label: "Right" });
  await saved(page);
  await expect(
    page.frameLocator("iframe").locator(".garden-button-block"),
  ).toHaveCSS("text-align", "right");
  await selectBlock(page, "Select Text 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await page
    .getByLabel("Alignment", { exact: true })
    .selectOption({ label: "Right" });
  if (isMobile)
    await page
      .getByRole("button", { name: "Close panel", exact: true })
      .click();
  await page
    .frameLocator("iframe")
    .getByRole("textbox", { name: "Text content", exact: true })
    .click();
  await page
    .getByRole("button", { name: "More text formatting", exact: true })
    .click();
  await page.getByRole("button", { name: "Align right", exact: true }).click();
  await saved(page);
  await page.reload();
  await expect(page.frameLocator("iframe").locator(".garden-text")).toHaveCSS(
    "text-align",
    "right",
  );
  await expect(page.frameLocator("iframe").locator(".garden-text p")).toHaveCSS(
    "text-align",
    "right",
  );
  const current = await (
    await page.request.get("/api/pages/" + source.id)
  ).json();
  expect(current.content.content[0].props.content[1].props.textRich).toContain(
    "text-align: right",
  );
  await page.goto("/p/" + source.id);
  await expect(page.locator(".garden-text p")).toHaveCSS("text-align", "right");
  await expect(page.locator(".garden-button-block")).toHaveCSS(
    "text-align",
    "right",
  );
});
