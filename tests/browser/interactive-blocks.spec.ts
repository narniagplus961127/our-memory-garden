import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { countUpParts } from "../../src/lib/live-count-up";
import { selectBlock } from "./editor-controls";

const env = parseEnv(readFileSync(".env.test", "utf8"));
const headers = {
  Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
};
const embedCode = `<style>button{color:rgb(20,60,43)}</style>
<button id="memory">Open memory</button>
<p id="network"></p>
<script>
  try { parent.document.title = "Escaped"; }
  catch { document.body.dataset.origin = "isolated"; }
  document.querySelector("#memory").onclick = () => {
    document.querySelector("#memory").textContent = "Memory opened";
  };
  fetch("https://example.invalid/probe").catch(() => {
    document.querySelector("#network").textContent = "Network blocked";
  });
</script>`;

test("count-up follows the Malaysia clock and clamps short anniversaries", () => {
  expect(
    countUpParts("2024-01-31", "09:00", Date.parse("2024-02-29T01:00:01Z")),
  ).toMatchObject({
    years: 0,
    months: 1,
    days: 0,
    totalDays: 29,
    hours: 0,
    seconds: 1,
  });
  expect(
    countUpParts("2024-01-31", "09:00", Date.parse("2024-03-31T01:00:00Z")),
  ).toMatchObject({ months: 2, days: 0, totalDays: 60, seconds: 0 });
  expect(
    countUpParts("2022-05-02", "00:00", Date.parse("2022-05-01T15:59:59Z")),
  ).toMatchObject({ days: 0, hours: 0, seconds: 0 });
  expect(
    countUpParts("2022-05-02", "00:00", Date.parse("2022-05-01T16:00:01Z"))
      .seconds,
  ).toBe(1);
});

test("author, round-trip and view a live counter and an isolated scripted embed", async ({
  page,
  browser,
  baseURL,
  isMobile,
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

  async function createPage(label: string) {
    const response = await page.request.post("/api/pages", {
      headers,
      data: { title: label + " " + crypto.randomUUID().slice(0, 8) },
    });
    expect(response.status()).toBe(201);
    return response.json();
  }
  const source = await createPage("Interactive blocks");
  await page.goto("/admin/pages/" + source.id);

  const palette = page.getByRole("button", {
    name: "Open content panel",
    exact: true,
  });
  await palette.click();
  await expect(
    page.getByRole("button", { name: "Add Live Count Up" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Add Section", exact: true }).click();
  await palette.click();
  await page.getByRole("button", { name: "Add Live Count Up" }).click();
  await page.getByRole("button", { name: "Add Custom Embed" }).click();

  const settings = page.getByRole("button", {
    name: "Open settings panel",
    exact: true,
  });
  await selectBlock(page, "Select Live Count Up 1");
  await settings.click();
  await page.getByLabel("Heading", { exact: true }).fill("我们的时光");
  await page.getByLabel("Start date", { exact: true }).fill("2022-05-02");
  await page.getByLabel("Start time (Malaysia time)").fill("09:00");
  const numberSize = page.getByLabel("Number size · px");
  await numberSize.fill("52");
  await numberSize.press("Enter");
  await selectBlock(page, "Select Custom Embed 1");
  await settings.click();
  await page.getByLabel("Embed title").fill("Memory card");
  await page.getByLabel("HTML, CSS and JavaScript").fill(embedCode);
  const height = page.getByLabel("Height · px", { exact: true });
  await height.fill("240");
  await height.press("Enter");
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");

  if (isMobile)
    await page
      .getByRole("button", { name: "Close panel", exact: true })
      .click();
  const canvas = page.frameLocator("iframe");
  await expect(
    canvas.getByRole("heading", { name: "我们的时光" }),
  ).toBeVisible();
  await expect(canvas.locator("iframe")).toHaveCount(0);
  await canvas.locator("button").filter({ hasText: "Run preview" }).click();
  const editorEmbed = canvas.frameLocator("iframe[title='Memory card']");
  await expect(editorEmbed.locator("body")).toHaveAttribute(
    "data-origin",
    "isolated",
  );
  await expect(editorEmbed.getByText("Network blocked")).toBeVisible();

  const exported = await page.request.get("/api/pages/" + source.id + "/json");
  expect(exported.ok()).toBeTruthy();
  const file = await exported.json();
  const [counter, embed] = file.page.blocks[0].blocks;
  expect(counter).toMatchObject({
    type: "LiveCountUp",
    settings: {
      heading: "我们的时光",
      startDate: "2022-05-02",
      startTime: "09:00",
      digitSize: 52,
    },
  });
  expect(embed).toMatchObject({
    type: "CustomEmbed",
    settings: { embedTitle: "Memory card", embedCode, embedHeight: 240 },
  });

  const target = await createPage("Imported interactive blocks");
  const targetJson = "/api/pages/" + target.id + "/json";
  expect(
    (
      await page.request.post(targetJson, {
        headers,
        data: { file, confirm: true },
      })
    ).ok(),
  ).toBeTruthy();
  expect(await (await page.request.get(targetJson)).json()).toEqual(file);

  const current = await (
    await page.request.get("/api/pages/" + target.id)
  ).json();
  expect(
    (
      await page.request.patch("/api/pages/" + target.id, {
        headers,
        data: { visibility: "public", version: current.version },
      })
    ).ok(),
  ).toBeTruthy();

  const visitor = await browser.newContext({
    viewport: page.viewportSize()!,
    reducedMotion: "reduce",
  });
  try {
    const view = await visitor.newPage();
    await view.goto(baseURL + "/p/" + target.id);
    await expect(
      view.getByRole("heading", { name: "我们的时光" }),
    ).toBeVisible();
    const seconds = view
      .locator(".count-up-clock .count-up-unit")
      .last()
      .locator(".count-up-digits");
    await expect(seconds).toHaveText(/^\d{2}$/);
    const first = await seconds.textContent();
    await expect(seconds).not.toHaveText(first!);
    await expect(seconds.locator(".count-up-digit-enter").first()).toHaveCSS(
      "animation-name",
      "none",
    );
    const iframe = view.locator("iframe[title='Memory card']");
    await expect(iframe).toHaveAttribute("sandbox", "allow-scripts");
    await expect(iframe).toHaveAttribute("height", "240");
    await iframe.scrollIntoViewIfNeeded();
    const widget = view.frameLocator("iframe[title='Memory card']");
    const interactive = widget.getByRole("button", { name: "Open memory" });
    await expect(interactive).toHaveCSS("color", "rgb(20, 60, 43)");
    await interactive.click();
    await expect(
      widget.getByRole("button", { name: "Memory opened" }),
    ).toBeVisible();
    await expect(widget.locator("body")).toHaveAttribute(
      "data-origin",
      "isolated",
    );
    await expect(widget.getByText("Network blocked")).toBeVisible();
    expect(await view.title()).not.toBe("Escaped");
    expect(
      await view
        .locator(".count-up")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBeTruthy();
    expect((await iframe.boundingBox())!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
  } finally {
    await visitor.close();
  }
});
