import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import sharp from "sharp";
import { selectBlock, startWithText, writeCanvas } from "./editor-controls";

const env = parseEnv(readFileSync(".env.test", "utf8"));
const headers = { Origin: env.NEXT_PUBLIC_APP_URL! };

test("confirm a page template with photo placeholders, edit it, and create independent pages", async ({
  page,
}) => {
  test.setTimeout(120000);
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
  const suffix = crypto.randomUUID().slice(0, 8);
  const image = await sharp({
    create: { width: 32, height: 24, channels: 3, background: "#7d9a71" },
  })
    .png()
    .toBuffer();
  const upload = await (
    await page.request.post("/api/media/uploads", {
      headers,
      data: {
        name: `template-${suffix}.png`,
        type: "image/png",
        size: image.length,
      },
    })
  ).json();
  expect(
    (
      await page.request.put(upload.uploadUrl, {
        headers: { "Content-Type": "image/png" },
        data: image,
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await page.request.post(`/api/media/${upload.id}/complete`, {
        headers,
        data: {},
      })
    ).ok(),
  ).toBeTruthy();
  const source = await (
    await page.request.post("/api/pages", {
      headers,
      data: { title: `Source ${suffix}` },
    })
  ).json();
  const sourceContent = {
    root: { props: { showTitle: false } },
    content: [
      {
        type: "Section",
        props: {
          id: "section",
          backgroundImage: { photoId: upload.id },
          content: [
            {
              type: "Columns",
              props: {
                id: "columns",
                left: [
                  {
                    type: "Text",
                    props: { id: "text", text: "Original memory", style: "p" },
                  },
                ],
                right: [
                  {
                    type: "Image",
                    props: {
                      id: "image",
                      photoId: upload.id,
                      alt: "",
                      caption: "A caption",
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  };
  const sourceSaved = await page.request.patch(`/api/pages/${source.id}`, {
    headers,
    data: { content: sourceContent, version: source.version },
  });
  expect(sourceSaved.status(), await sourceSaved.text()).toBe(200);
  const savedContent = (await sourceSaved.json()).content;

  await page.goto(`/admin/pages/${source.id}`);
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  const copy = page.getByRole("button", {
    name: "Save as template",
    exact: true,
  });
  const confirmation = page.getByRole("dialog", {
    name: "Save page as a template?",
    exact: true,
  });
  let copies = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith("/api/templates"))
      copies++;
  });
  await copy.click();
  await expect(confirmation).toContainText(
    "Photos will be replaced with placeholders",
  );
  await confirmation
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  expect(copies).toBe(0);
  await expect(copy).toBeFocused();
  await copy.click();
  const name = `Memory layout ${suffix}`;
  await confirmation.getByRole("textbox", { name: "Template name" }).fill(name);
  const [created] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith("/api/templates"),
    ),
    confirmation
      .getByRole("button", { name: "Save template", exact: true })
      .click(),
  ]);
  expect(created.status()).toBe(201);
  const template = await created.json();
  const layout = template.content.content[0].props;
  expect(layout.backgroundImage).toBeUndefined();
  expect(layout.content[0].props.right[0].props).toEqual({
    id: "image",
    alt: "",
    caption: "A caption",
  });
  await page
    .getByRole("button", { name: "Edit template", exact: true })
    .click();
  await expect(page).toHaveURL(`/admin/templates/${template.id}`);
  const frame = page.frameLocator("iframe");
  await expect(
    frame.getByRole("img", { name: "Photo placeholder", exact: true }),
  ).toBeVisible();
  await expect(
    frame.getByRole("button", { name: "Choose photo", exact: true }),
  ).toHaveCount(0);
  await selectBlock(page, "Select Text 1");
  await page.route(
    `**/api/templates/${template.id}`,
    (route) =>
      route.fulfill({
        status: 503,
        json: { error: "Temporary save failure." },
      }),
    { times: 1 },
  );
  await writeCanvas(page, "Text content", "Template-only edit");
  await expect(
    page.getByRole("status", { name: "Template save status" }),
  ).toHaveText("Not saved");
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(
    page.getByRole("status", { name: "Template save status" }),
  ).toHaveText("Saved");
  await page.reload();
  await expect(
    frame.getByText("Template-only edit", { exact: true }),
  ).toBeVisible();

  await page.goto("/admin/pages/new");
  await page.getByRole("radio", { name, exact: true }).check();
  await page
    .getByRole("textbox", { name: "Page title", exact: true })
    .fill(`From template ${suffix}`);
  const [createdPage] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith("/api/pages"),
    ),
    page
      .getByRole("button", { name: "Create private page", exact: true })
      .click(),
  ]);
  expect(createdPage.status()).toBe(201);
  const derived = await createdPage.json();
  expect(derived.visibility).toBe("private");
  expect(JSON.stringify(derived.content)).toContain("Template-only edit");
  const original = await (
    await page.request.get(`/api/pages/${source.id}`)
  ).json();
  expect(original.content).toEqual(savedContent);

  await page.goto("/admin/templates/new");
  const field = (await page
    .getByRole("textbox", { name: "Template name" })
    .boundingBox())!;
  const action = (await page
    .getByRole("button", { name: "Create template", exact: true })
    .boundingBox())!;
  expect(action.y - field.y - field.height).toBeGreaterThanOrEqual(16);
  expect(action.x).toBe(field.x);
  await page
    .getByRole("textbox", { name: "Template name" })
    .fill(`Blank layout ${suffix}`);
  await page
    .getByRole("button", { name: "Create template", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin\/templates\/[0-9a-f-]+$/);
  await startWithText(page);
  const blankId = page.url().split("/").at(-1);
  const [blankSave] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "PATCH" &&
        response.url().endsWith(`/api/templates/${blankId}`) &&
        JSON.stringify(response.request().postDataJSON()).includes(
          "Built from a blank template",
        ),
    ),
    writeCanvas(page, "Text content", "Built from a blank template"),
  ]);
  expect(blankSave.ok()).toBeTruthy();
  await expect(
    page.getByRole("status", { name: "Template save status" }),
  ).toHaveText("Saved");

  await page.goto("/admin/templates");
  const remove = page.getByRole("button", {
    name: `Delete ${name}`,
    exact: true,
  });
  const deletion = page.getByRole("dialog", {
    name: `Delete ${name}?`,
    exact: true,
  });
  await remove.click();
  await deletion.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(remove).toBeFocused();
  await remove.click();
  await deletion
    .getByRole("button", { name: "Delete template", exact: true })
    .click();
  await expect(remove).toHaveCount(0);
  await page.goto("/admin/pages/new");
  await expect(page.getByRole("radio", { name, exact: true })).toHaveCount(0);
  expect(
    (await (await page.request.get(`/api/pages/${derived.id}`)).json()).content,
  ).toEqual(derived.content);
});

test("both starter layouts can be renamed with autosave and selected by their new names", async ({
  page,
}) => {
  test.setTimeout(120000);
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
  for (const name of ["Our story", "Garden journal"]) {
    await page.goto("/admin/templates");
    await page.getByRole("link", { name: `Edit ${name}`, exact: true }).click();
    const title = page.getByRole("textbox", {
      name: "Template name",
      exact: true,
    });
    await expect(title).toHaveValue(name);
    const id = page.url().split("/").at(-1);
    const renamed = `${name} ${crypto.randomUUID().slice(0, 8)}`;
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === "PATCH" &&
          response.url().endsWith(`/api/templates/${id}`) &&
          response.request().postDataJSON().name === renamed,
      ),
      title.fill(renamed),
    ]);
    expect(response.ok()).toBeTruthy();
    const saved = await response.json();
    try {
      await expect(
        page.getByRole("status", { name: "Template save status" }),
      ).toHaveText("Saved");
      await expect(
        page.getByRole("button", { name: "Save template", exact: true }),
      ).toHaveCount(0);
      await page.goto("/admin/pages/new");
      await expect(
        page.getByRole("radio", { name: renamed, exact: true }),
      ).toBeVisible();
    } finally {
      expect(
        (
          await page.request.patch(`/api/templates/${id}`, {
            headers,
            data: { name, version: saved.version, content: saved.content },
          })
        ).ok(),
      ).toBeTruthy();
    }
  }
});
