import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { chooseAddTarget, selectBlock } from "./editor-controls";

const env = parseEnv(readFileSync(".env.test", "utf8"));
const headers = {
  Origin: process.env.PLAYWRIGHT_BASE_URL ?? env.NEXT_PUBLIC_APP_URL!,
};

test("create a Swiper, round-trip its slides, and browse with responsive pagination", async ({
  page,
  browser,
  baseURL,
  isMobile,
}) => {
  test.setTimeout(100000);
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

  async function addPage(title: string) {
    const result = await page.request.post("/api/pages", {
      headers,
      data: { title: title + " " + crypto.randomUUID().slice(0, 8) },
    });
    expect(result.status()).toBe(201);
    return result.json();
  }
  const source = await addPage("Swiper fixture");
  await page.goto("/admin/pages/" + source.id);
  const contentPanel = page.getByRole("button", {
    name: "Open content panel",
    exact: true,
  });
  await contentPanel.click();
  const addSwiper = page.getByRole("button", {
    name: "Add Swiper",
    exact: true,
  });
  await expect(addSwiper).toBeDisabled();
  await page.getByRole("button", { name: "Add Section", exact: true }).click();
  await contentPanel.click();
  await addSwiper.click();
  await chooseAddTarget(page, "Swiper 1 · slides");
  const addText = page.getByRole("button", { name: "Add Text", exact: true });
  const canvas = page.frameLocator("iframe");
  const slides = canvas.locator(".garden-swiper-track > [data-puck-component]");
  for (let index = 1; index <= 5; index++) {
    await addText.click();
    await expect(slides).toHaveCount(index);
  }

  const settings = page.getByRole("button", {
    name: "Open settings panel",
    exact: true,
  });
  await selectBlock(page, "Select Swiper 1");
  await settings.click();
  await page
    .getByLabel("Slides per view", { exact: true })
    .selectOption({ value: JSON.stringify({ value: 2 }) });
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await selectBlock(page, "Select Section 1");
  await settings.click();
  await page
    .getByLabel("Background", { exact: true })
    .selectOption({ value: JSON.stringify({ value: "dark-green" }) });
  await expect(
    page.getByRole("status", { name: "Auto-save status" }),
  ).toHaveText("Saved");
  await expect(canvas.locator(".garden-section")).toHaveCSS(
    "background-color",
    "rgb(46, 70, 48)",
  );
  const exported = await (
    await page.request.get("/api/pages/" + source.id + "/json")
  ).json();
  expect(exported.page.blocks[0].settings.background).toBe("dark-green");
  const block = exported.page.blocks[0].blocks[0];
  expect(block).toMatchObject({
    type: "Swiper",
    settings: { slidesPerView: 2, mobileSlidesPerView: 1 },
  });
  expect(block.blocks.map((item: { type: string }) => item.type)).toEqual(
    Array(5).fill("Text"),
  );

  // Distinct copy lets the visitor test follow the order across pages.
  for (const [index, item] of block.blocks.entries()) {
    delete item.html;
    item.text = "Slide " + (index + 1);
  }
  const target = await addPage("Imported swiper");
  expect(
    (
      await page.request.post("/api/pages/" + target.id + "/json", {
        headers,
        data: { file: exported, confirm: true },
      })
    ).ok(),
  ).toBeTruthy();
  const saved = await (
    await page.request.get("/api/pages/" + target.id)
  ).json();
  expect(
    (
      await page.request.patch("/api/pages/" + target.id, {
        headers,
        data: { version: saved.version, visibility: "public" },
      })
    ).ok(),
  ).toBeTruthy();

  const visitor = await browser.newContext({
    viewport: isMobile
      ? { width: 390, height: 844 }
      : { width: 1200, height: 850 },
    hasTouch: isMobile,
    isMobile,
    reducedMotion: "reduce",
  });
  try {
    const view = await visitor.newPage();
    await view.goto(baseURL + "/p/" + target.id);
    const swiper = view.getByRole("region", { name: "Swiper", exact: true });
    const pagination = swiper.getByRole("navigation", {
      name: "Swiper pagination",
    });
    await expect(pagination.getByRole("button")).toHaveCount(isMobile ? 5 : 3);
    const activeDot = pagination.getByRole("button", {
      name: "Go to page 1",
      exact: true,
    });
    const inactiveDot = pagination.getByRole("button", {
      name: "Go to page 2",
      exact: true,
    });
    await expect(activeDot).toHaveAttribute("aria-current", "page");
    await expect(activeDot).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(activeDot).toHaveCSS("border-top-width", "0px");
    await expect(activeDot.locator("span")).toHaveCSS("width", "10px");
    await expect(inactiveDot.locator("span")).toHaveCSS("width", "7px");
    const rail = (await swiper.locator(".garden-swiper-rail").boundingBox())!;
    const pageDots = (await pagination.boundingBox())!;
    expect(pageDots.y - (rail.y + rail.height)).toBeCloseTo(2, 0);
    expect(pageDots.height).toBeCloseTo(24, 0);
    const viewport = swiper.locator(".garden-swiper-viewport");
    const width = (await viewport.boundingBox())!.width;
    const slides = swiper.locator(".garden-swiper-track > *");
    expect((await slides.first().boundingBox())!.width).toBeCloseTo(
      isMobile ? width : (width - 16) / 2,
      0,
    );
    await expect(swiper.getByText("Slide 1", { exact: true })).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
    const header = view.locator(".public-header");
    await expect(header).toHaveCSS("background-color", "rgb(255, 248, 231)");
    await expect(header).not.toHaveCSS("box-shadow", "none");
    await expect(header.locator(".brand")).toHaveCSS(
      "color",
      "rgb(46, 70, 48)",
    );
    await expect(header.locator(".brand img")).toHaveCSS("filter", "none");

    await swiper.getByRole("button", { name: "Next slides" }).click();
    await expect(
      pagination.getByRole("button", { name: "Go to page 2", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await pagination
      .getByRole("button", { name: "Go to page 1", exact: true })
      .click();
    await expect(
      swiper.getByRole("button", { name: "Previous slides" }),
    ).toBeDisabled();

    if (isMobile) {
      await viewport.scrollIntoViewIfNeeded();
      const box = (await viewport.boundingBox())!;
      const cdp = await visitor.newCDPSession(view);
      try {
        const y = box.y + box.height / 2;
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: box.x + box.width * 0.88, y }],
        });
        for (let step = 1; step <= 10; step++)
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{ x: box.x + box.width * (0.88 - 0.075 * step), y }],
          });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      } finally {
        await cdp.detach();
      }
      await expect(
        swiper.getByRole("button", { name: "Previous slides" }),
      ).toBeEnabled();
    }
  } finally {
    await visitor.close();
  }
});
