import { test, expect, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { selectBlock, setVisibility } from "./editor-controls";

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

async function drag(
  page: Page,
  mobile: boolean,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  if (!mobile) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
    return;
  }
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [from],
    });
    for (let step = 1; step <= 8; step++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: from.x + ((to.x - from.x) * step) / 8,
            y: from.y + ((to.y - from.y) * step) / 8,
          },
        ],
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await session.detach();
  }
}

function sectionInsets(grid: Locator) {
  return grid.evaluate((element) => {
    const section = element.closest(".garden-section")!.getBoundingClientRect();
    const grid = element.getBoundingClientRect();
    return [
      Math.round(grid.left - section.left),
      Math.round(section.right - grid.right),
    ];
  });
}

test("add a Photo grid, select photos, reorder and open the website viewer", async ({
  page,
  browser,
  baseURL,
  isMobile,
}, info) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        headers,
        data: {
          email: env.TEST_ADMIN_EMAIL,
          password: env.TEST_ADMIN_PASSWORD,
        },
      })
    ).status(),
  ).toBe(200);
  const photoKey = crypto.randomUUID().slice(0, 8);
  const names = ["portrait", "landscape", "square"].map(
    (name) => name + "-" + photoKey + ".png",
  );
  const photoIds: string[] = [];
  for (const [index, [width, height]] of [
    [1600, 2400],
    [2250, 1050],
    [90, 90],
  ].entries()) {
    const bytes = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: ["#669977", "#a8825f", "#81a2ae"][index],
      },
    })
      .png()
      .toBuffer();
    const uploaded = await page.request.post("/api/media/uploads", {
      headers,
      data: {
        name: names[index],
        type: "image/png",
        size: bytes.length,
      },
    });
    expect(uploaded.status()).toBe(201);
    const upload = await uploaded.json();
    photoIds.push(upload.id);
    expect(
      (
        await page.request.put(upload.uploadUrl, {
          headers: { "Content-Type": "image/png" },
          data: bytes,
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await page.request.post("/api/media/" + upload.id + "/complete", {
          headers,
          data: {},
        })
      ).ok(),
    ).toBeTruthy();
  }
  const created = await page.request.post("/api/pages", {
    headers,
    data: { title: "Photo grid " + Date.now() },
  });
  expect(created.status()).toBe(201);
  const garden = await created.json();
  await page.goto("/admin/pages/" + garden.id);
  const content = page.getByRole("button", {
    name: "Open content panel",
    exact: true,
  });
  await expect(content).toBeEnabled();
  await content.click();
  const addGrid = page.getByRole("button", {
    name: "Add Photo grid",
    exact: true,
  });
  await expect(addGrid).toBeDisabled();
  await page.getByRole("button", { name: "Add Section", exact: true }).click();
  await addGrid.click();
  const status = page.getByRole("status", { name: "Auto-save status" });
  await expect(status).toHaveText("Saved");
  await selectBlock(page, "Select Photo grid 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  await expect(page.getByLabel("Photo animation", { exact: true })).toHaveValue(
    "fade-in",
  );
  const add = page.getByRole("button", { name: "+ Add photos", exact: true });
  await add.click();
  const chooser = page.getByRole("dialog", { name: "Choose photos" });
  if (!isMobile) {
    await chooser
      .getByRole("searchbox", { name: "Find a photo" })
      .fill(photoKey);
    const tiles = chooser.getByRole("button", { name: new RegExp(photoKey) });
    await expect(tiles).toHaveCount(3);
    const count = chooser.locator(".photo-grid-selection-count");
    await tiles.first().click();
    await tiles.last().click({ modifiers: ["Shift"] });
    await expect(count).toHaveText("3 selected");
    await tiles.nth(1).click({ modifiers: ["Control"] });
    await expect(count).toHaveText("2 selected");
    await tiles.nth(1).press("Control+a");
    await expect(count).toHaveText("3 selected");
    for (let i = 0; i < 3; i++) await tiles.nth(i).click();
    await expect(count).toHaveText("0 selected");
  }
  for (const name of names) {
    await chooser.getByRole("searchbox", { name: "Find a photo" }).fill(name);
    await chooser.getByRole("button", { name, exact: true }).click();
  }
  await expect(
    chooser.getByRole("status").filter({ hasText: "3 selected" }),
  ).toBeVisible();
  await chooser
    .getByRole("button", { name: "Add 3 photos", exact: true })
    .click();
  await expect(chooser).toHaveCount(0);
  const rows = page
    .getByRole("list", { name: "Grid photos" })
    .getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(rows.first().locator(".photo-grid-grip svg")).toHaveCount(0);
  const tile = rows.first();
  await expect(tile.locator("img")).toHaveAttribute("src", /\/thumb-320$/);
  const thumbnail = (await tile
    .getByRole("button", { name: "Drag " + names[0] })
    .boundingBox())!;
  const actions = tile.getByRole("button", { name: "Actions for " + names[0] });
  await expect(actions).toHaveCSS("position", "absolute");
  const overlay = (await actions.boundingBox())!;
  expect(overlay.width).toBeLessThan(thumbnail.width);
  expect(overlay.y).toBeCloseTo(thumbnail.y, 0);
  expect(overlay.y + overlay.height).toBeLessThanOrEqual(
    thumbnail.y + thumbnail.height,
  );
  expect(overlay.x + overlay.width).toBeCloseTo(
    thumbnail.x + thumbnail.width,
    0,
  );
  let first = (await rows.nth(0).boundingBox())!;
  let second = (await rows.nth(1).boundingBox())!;
  expect(Math.round(first.y)).toBe(Math.round(second.y));
  const landscapeDrag = rows
    .nth(1)
    .getByRole("button", { name: "Drag " + names[1] });
  await landscapeDrag.evaluate((button) =>
    button.scrollIntoView({ block: "center" }),
  );
  first = (await rows.nth(0).boundingBox())!;
  second = (await rows.nth(1).boundingBox())!;
  const from = {
    x: second.x + second.width / 4,
    y: second.y + second.height * 0.75,
  };
  const to = { x: first.x + first.width / 4, y: first.y + first.height * 0.75 };
  expect(
    await landscapeDrag.evaluate(
      (button, point) =>
        button.contains(
          button.ownerDocument.elementFromPoint(point.x, point.y),
        ),
      from,
    ),
  ).toBeTruthy();
  await drag(page, isMobile, from, to);
  await expect(
    rows.first().getByRole("button", { name: "Drag " + names[1] }),
  ).toBeVisible();
  const landscapeActions = page.getByRole("button", {
    name: "Actions for " + names[1],
  });
  await landscapeActions.click();
  await page.getByRole("menuitem", { name: "Edit details" }).click();
  const details = page.getByRole("dialog", { name: "Edit photo details" });
  await details
    .getByLabel("Alt text", { exact: true })
    .fill("A landscape photo");
  await details.getByLabel("Caption", { exact: true }).fill("A long afternoon");
  await details
    .getByRole("button", { name: "Save photo details", exact: true })
    .click();
  await expect(details).toHaveCount(0);
  await page.getByRole("button", { name: "Actions for " + names[2] }).click();
  await page.getByRole("menuitem", { name: "Remove from grid" }).click();
  await expect(rows).toHaveCount(2);
  await page.getByLabel("Gap (px)", { exact: true }).fill("16");
  await expect(status).toHaveText("Saved");
  const canvas = page.frameLocator("iframe");
  await expect(canvas.locator(".garden-document")).toHaveCSS(
    "padding-top",
    "0px",
  );
  const grid = canvas.locator(".garden-photo-grid");
  const section = canvas.locator(".garden-section");
  const insets = isMobile ? [28, 28] : [64, 64];
  await expect.poll(() => sectionInsets(grid)).toEqual(insets);
  const firstTile = grid.locator(".photo-grid-tile").first();
  await expect(firstTile.locator("img")).toHaveAttribute(
    "srcset",
    /\/thumb-320 320w/,
  );
  const normalWidth = (await grid.boundingBox())!.width;
  await selectBlock(page, "Select Section 1");
  await page
    .getByRole("button", { name: "Open settings panel", exact: true })
    .click();
  const width = page.getByRole("group", { name: "Section width" });
  await width.getByRole("button", { name: "Full width", exact: true }).click();
  await expect(status).toHaveText("Saved");
  await expect(section).toHaveClass(/garden-section-full/);
  await expect.poll(() => sectionInsets(grid)).toEqual([0, 0]);
  expect((await grid.boundingBox())!.width).toBeGreaterThan(normalWidth);
  await expect
    .poll(() =>
      firstTile.evaluate((tile) => {
        const layout = tile.parentElement!;
        const width = layout.clientWidth;
        const columns = width < 300 ? 1 : width < 640 ? 2 : width < 960 ? 3 : 4;
        const expected = (width - 16 * (columns - 1)) / columns;
        return Math.abs(tile.getBoundingClientRect().width - expected);
      }),
    )
    .toBeLessThan(1);
  await width
    .getByRole("button", { name: "Normal container", exact: true })
    .click();
  await expect(status).toHaveText("Saved");
  const background = page.getByRole("button", {
    name: "Choose background image",
    exact: true,
  });
  await background.click();
  const library = page.getByRole("dialog", { name: "Choose a photo" });
  await expect(
    library.getByRole("searchbox", { name: "Find a photo" }),
  ).toBeVisible();
  await library.getByRole("button", { name: "Close photo library" }).click();
  await expect(background).toBeFocused();
  await page.screenshot({ path: info.outputPath("photo-grid-editor.png") });
  await setVisibility(page, "public");
  await expect(status).toHaveText("Saved");
  const cover = page.getByRole("button", { name: "Choose photo", exact: true });
  await cover.click();
  await expect(
    library.getByRole("searchbox", { name: "Find a photo" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(cover).toBeFocused();
  await page
    .getByRole("button", { name: "Choose sharing cover photo", exact: true })
    .click();
  await expect(
    library.getByRole("searchbox", { name: "Find a photo" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  const visitor = await browser.newContext({
    viewport: isMobile
      ? { width: 390, height: 844 }
      : { width: 1360, height: 920 },
    hasTouch: isMobile,
    isMobile,
  });
  try {
    const website = await visitor.newPage();
    website.on("pageerror", (error) => errors.push(error.message));
    await website.goto(baseURL + "/p/" + garden.id);
    const open = website.getByRole("button", {
      name: "Open A landscape photo",
      exact: true,
    });
    await expect(open).toBeVisible();
    const publicGrid = website.locator(".garden-photo-grid");
    const photos = publicGrid.locator(".photo-grid-tile");
    await expect(photos.first()).toHaveAttribute("data-animation", "fade-in");
    await expect(photos.first()).toHaveAttribute("data-motion", "enter");
    await expect(website.locator(".public-visual-page")).toHaveCSS(
      "padding-bottom",
      "0px",
    );
    await expect(website.locator(".garden-document")).toHaveCSS(
      "padding-top",
      "0px",
    );
    await expect.poll(() => sectionInsets(publicGrid)).toEqual(insets);
    await expect
      .poll(() =>
        open
          .locator("img")
          .evaluate((image: HTMLImageElement) =>
            image.complete && image.naturalWidth > 0 ? image.currentSrc : "",
          ),
      )
      .toMatch(/\/thumb-(320|640|1280)$/);
    const landscape = await open.locator("img").boundingBox();
    const portrait = await website
      .getByRole("button", { name: "Open Photo 2", exact: true })
      .locator("img")
      .boundingBox();
    expect(landscape!.height).toBeLessThan(portrait!.height);
    expect(landscape!.width).toBeCloseTo(portrait!.width, 0);
    await open.click();
    const viewer = website.getByRole("dialog", { name: "Photo grid viewer" });
    await expect(viewer.getByText("A long afternoon")).toBeVisible();
    const titleContrast = await viewer
      .locator(".garden-modal-header")
      .evaluate((header) => {
        const title = header.querySelector('[data-slot="dialog-title"]')!;
        const luminance = (colour: string) => {
          const [r, g, b] = colour
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((channel) => {
              const value = channel / 255;
              return value <= 0.04045
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4;
            });
          return r * 0.2126 + g * 0.7152 + b * 0.0722;
        };
        const foreground = luminance(getComputedStyle(title).color);
        const background = luminance(getComputedStyle(header).backgroundColor);
        return (
          (Math.max(foreground, background) + 0.05) /
          (Math.min(foreground, background) + 0.05)
        );
      });
    expect(titleContrast).toBeGreaterThanOrEqual(4.5);
    await expect(viewer.locator("img")).toHaveAttribute("src", /\/thumb-640$/);
    await expect(viewer.locator("img")).toHaveAttribute(
      "srcset",
      /\/thumb-1280 1280w/,
    );
    await expect
      .poll(() =>
        viewer
          .locator("img")
          .evaluate((image: HTMLImageElement) =>
            image.complete && image.naturalWidth > 0 ? image.currentSrc : "",
          ),
      )
      .toMatch(/\/thumb-(320|640|1280)$/);

    const dialogBox = (await viewer.boundingBox())!;
    expect(Math.round(dialogBox.x)).toBe(0);
    expect(Math.round(dialogBox.y)).toBe(0);
    expect(Math.round(dialogBox.width)).toBe(website.viewportSize()!.width);
    expect(Math.round(dialogBox.height)).toBe(website.viewportSize()!.height);
    await website.screenshot({
      path: info.outputPath("photo-grid-fullscreen.png"),
    });
    await viewer.getByRole("button", { name: "Zoom in" }).click();
    await expect(viewer.locator("img")).toHaveAttribute("src", /\/display$/);
    await expect(viewer.locator("img")).not.toHaveAttribute("srcset");
    await expect(viewer.getByRole("button", { name: "Reset zoom" })).toHaveText(
      "150%",
    );
    await viewer.getByRole("button", { name: "Reset zoom" }).click();
    await expect(viewer.locator("img")).toHaveAttribute("src", /\/display$/);
    const next = viewer.getByRole("button", { name: "Next photo" });
    const pan = (await viewer.locator(".photo-lightbox-pan").boundingBox())!;
    const nextBox = (await next.boundingBox())!;
    expect(
      Math.abs(nextBox.y + nextBox.height / 2 - pan.y - pan.height / 2),
    ).toBeLessThan(2);
    if (isMobile) {
      const center = pan.y + pan.height / 2;
      const pinch = await visitor.newCDPSession(website);
      const pinchPoints = (radius: number) =>
        [-1, 1].map((side, id) => ({
          id,
          x: pan.x + pan.width / 2 + side * radius,
          y: center,
        }));
      try {
        await pinch.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: pinchPoints(32),
        });
        for (const radius of [38, 45, 55, 64])
          await pinch.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: pinchPoints(radius),
          });
        await pinch.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      } finally {
        await pinch.detach();
      }
      await expect(viewer.locator(".photo-lightbox-pan")).toHaveAttribute(
        "data-zoom",
        "true",
      );
      await viewer.getByRole("button", { name: "Reset zoom" }).click();
      await drag(
        website,
        true,
        { x: pan.x + pan.width * 0.75, y: center },
        { x: pan.x + pan.width * 0.25, y: center },
      );
    } else {
      await next.click({ timeout: 6000 });
    }
    await expect(
      viewer.getByRole("img", { name: "Photo 2", exact: true }),
    ).toBeVisible();
    await website.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await expect(open).toBeFocused();
    await website.screenshot({
      path: info.outputPath("photo-grid-website.png"),
    });
    await selectBlock(page, "Select Section 1");
    await page
      .getByRole("button", { name: "Open settings panel", exact: true })
      .click();
    await width
      .getByRole("button", { name: "Full width", exact: true })
      .click();
    await expect(status).toHaveText("Saved");
    await website.reload();
    await expect.poll(() => sectionInsets(publicGrid)).toEqual([0, 0]);
    await selectBlock(page, "Select Photo grid 1");
    await page
      .getByRole("button", { name: "Open settings panel", exact: true })
      .click();
    await page
      .getByLabel("Photo animation", { exact: true })
      .selectOption("none");
    await expect(status).toHaveText("Saved");
    await website.reload();
    await expect(photos.first()).toHaveAttribute("data-animation", "none");
    await expect(photos.first()).not.toHaveAttribute("data-motion");
    const imagePage = await page.request.post("/api/pages", {
      headers,
      data: { title: "Standalone photo " + Date.now() },
    });
    expect(imagePage.status()).toBe(201);
    const standalone = await imagePage.json();
    expect(
      (
        await page.request.patch("/api/pages/" + standalone.id, {
          headers,
          data: {
            version: standalone.version,
            visibility: "public",
            content: {
              root: { props: {} },
              content: [
                {
                  type: "Section",
                  props: {
                    id: "photo-section",
                    content: [
                      {
                        type: "Image",
                        props: {
                          id: "standalone-photo",
                          photoId: photoIds[0],
                          alt: "Portrait memory",
                          caption: "An afternoon together",
                        },
                      },
                      {
                        type: "Image",
                        props: {
                          id: "linked-photo",
                          photoId: photoIds[1],
                          alt: "Linked landscape",
                          destination: {
                            kind: "external",
                            url: "https://example.com/photo",
                          },
                        },
                      },
                      {
                        type: "Swiper",
                        props: {
                          id: "photo-swiper",
                          slidesPerView: 1,
                          mobileSlidesPerView: 1,
                          content: [
                            {
                              type: "Image",
                              props: {
                                id: "swiper-first",
                                photoId: photoIds[0],
                                alt: "First Swiper photo",
                              },
                            },
                            {
                              type: "Text",
                              props: {
                                id: "swiper-text",
                                text: "An intervening slide",
                                style: "p",
                              },
                            },
                            {
                              type: "Image",
                              props: {
                                id: "swiper-placeholder",
                                alt: "Empty slide",
                              },
                            },
                            {
                              type: "Image",
                              props: {
                                id: "swiper-last",
                                photoId: photoIds[1],
                                alt: "Last Swiper photo",
                              },
                            },
                          ],
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
    await website.goto(baseURL + "/p/" + standalone.id);
    const standaloneViewer = website.getByRole("dialog", {
      name: "Photo viewer",
      exact: true,
    });
    const photo = website.getByRole("button", {
      name: "Zoom Portrait memory",
      exact: true,
    });
    await photo.click();
    await expect(standaloneViewer.locator("img")).toHaveAttribute(
      "src",
      /\/thumb-640$/,
    );
    await expect(
      standaloneViewer.getByRole("img", {
        name: "Portrait memory",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      standaloneViewer.getByText("An afternoon together"),
    ).toBeVisible();
    await expect(
      standaloneViewer.getByRole("button", { name: "Next photo" }),
    ).toHaveCount(0);
    await standaloneViewer
      .getByRole("button", { name: "Zoom in", exact: true })
      .click();
    await expect(
      standaloneViewer.getByRole("button", { name: "Reset zoom" }),
    ).toHaveText("150%");
    await standaloneViewer
      .getByRole("button", { name: "Close photo viewer" })
      .click();
    await expect(photo).toBeFocused();
    await expect(
      website.getByRole("link", { name: "Linked landscape", exact: true }),
    ).toHaveAttribute("href", "https://example.com/photo");
    await website
      .getByRole("button", { name: "Zoom Linked landscape", exact: true })
      .click();
    await expect(
      standaloneViewer.getByRole("img", {
        name: "Linked landscape",
        exact: true,
      }),
    ).toBeVisible();
    await standaloneViewer
      .getByRole("button", { name: "Close photo viewer" })
      .click();

    const carousel = website.getByRole("region", {
      name: "Swiper",
      exact: true,
    });
    const swiperPhoto = carousel.getByRole("button", {
      name: "Zoom First Swiper photo",
    });
    await swiperPhoto.click();
    await expect(standaloneViewer.getByText("1 of 2")).toBeVisible();
    const nextPhoto = standaloneViewer.getByRole("button", {
      name: "Next photo",
    });
    if (isMobile) {
      const pan = (await standaloneViewer
        .locator(".photo-lightbox-pan")
        .boundingBox())!;
      await drag(
        website,
        true,
        { x: pan.x + pan.width * 0.75, y: pan.y + pan.height / 2 },
        { x: pan.x + pan.width * 0.25, y: pan.y + pan.height / 2 },
      );
    } else {
      await nextPhoto.click();
    }
    await expect(
      standaloneViewer.getByRole("img", { name: "Last Swiper photo" }),
    ).toBeVisible();
    await expect(standaloneViewer.getByText("2 of 2")).toBeVisible();
    await expect(standaloneViewer.locator("img")).toHaveAttribute(
      "src",
      /\/thumb-640$/,
    );
    await expect(nextPhoto).toBeDisabled();
    await standaloneViewer
      .getByRole("button", { name: "Zoom in", exact: true })
      .click();
    await expect(
      standaloneViewer.getByRole("button", { name: "Reset zoom" }),
    ).toHaveText("150%");
    await standaloneViewer
      .getByRole("button", { name: "Previous photo" })
      .click();
    await expect(
      standaloneViewer.getByRole("img", { name: "First Swiper photo" }),
    ).toBeVisible();
    await expect(
      standaloneViewer.getByRole("button", { name: "Reset zoom" }),
    ).toHaveText("100%");
    await standaloneViewer
      .getByRole("button", { name: "Close photo viewer" })
      .click();
    await expect(swiperPhoto).toBeFocused();
    expect(errors).toEqual([]);
  } finally {
    await visitor.close();
  }
});

test("Photo Grid can select more than 100 photos in the library at once", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Exercise the keyboard selection shortcut.");
  const signedIn = await page.request.post("/api/auth/sign-in/email", {
    headers,
    data: { email: env.TEST_ADMIN_EMAIL, password: env.TEST_ADMIN_PASSWORD },
  });
  expect(signedIn.ok()).toBeTruthy();
  const created = await page.request.post("/api/pages", {
    headers,
    data: { title: "Bulk photo picker " + crypto.randomUUID().slice(0, 8) },
  });
  expect(created.status()).toBe(201);
  const garden = await created.json();
  const saved = await page.request.patch("/api/pages/" + garden.id, {
    headers,
    data: {
      version: garden.version,
      content: {
        root: { props: {} },
        content: [
          {
            type: "Section",
            props: {
              id: "section",
              content: [{ type: "PhotoGrid", props: { id: "grid" } }],
            },
          },
        ],
      },
    },
  });
  expect(saved.status()).toBe(200);

  const fixtures = Array.from({ length: 105 }, (_, index) => ({
    photoId: crypto.randomUUID(),
    name: "Bulk fixture " + (index + 1),
    width: 100,
    height: 100,
  }));
  await page.route(
    (url) =>
      url.pathname === "/api/media" &&
      url.searchParams.get("view") === "grid-picker",
    (route) => {
      const offset = Number(
        new URL(route.request().url()).searchParams.get("offset"),
      );
      const next = offset + 24;
      return route.fulfill({
        json: {
          photos: fixtures.slice(offset, next),
          more: next < fixtures.length,
        },
      });
    },
  );
  await page.route("**/api/media/*/thumb-*", (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto("/admin/pages/" + garden.id);
  await selectBlock(page, "Select Photo grid 1");
  await page.getByRole("button", { name: "+ Add photos", exact: true }).click();
  const chooser = page.getByRole("dialog", { name: "Choose photos" });
  const more = chooser.getByRole("button", {
    name: "Show more library photos",
  });
  for (const loaded of [48, 72, 96, 105]) {
    await more.click();
    await expect(
      chooser.getByRole("button", { name: /^Bulk fixture / }),
    ).toHaveCount(loaded);
  }
  await chooser
    .getByRole("button", { name: "Bulk fixture 1", exact: true })
    .press("Control+a");
  await expect(
    chooser.getByRole("button", { name: "Add 105 photos" }),
  ).toBeEnabled();
});
