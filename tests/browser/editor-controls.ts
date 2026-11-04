import { type Page } from "@playwright/test";
import type { GardenPage, PageData } from "../../src/lib/pages";

// Explicit historic fixture: recovery and compatibility tests must not depend
// on today's empty blank-page template.
export function legacyTextContent(): PageData {
  return {
    root: { props: {} },
    content: [
      {
        type: "Text",
        props: { id: crypto.randomUUID(), text: "", style: "p" },
      },
    ],
  };
}
export async function seedLegacyTextPage(
  page: Page,
  garden: GardenPage,
  origin: string,
) {
  const response = await page.request.patch("/api/pages/" + garden.id, {
    headers: { Origin: origin },
    data: { version: garden.version, content: legacyTextContent() },
  });
  if (!response.ok())
    throw new Error("Could not seed legacy text fixture: " + response.status());
  return (await response.json()) as GardenPage;
}
export async function startWithText(page: Page) {
  await page
    .getByRole("button", { name: "Open content panel", exact: true })
    .click();
  await page.getByRole("button", { name: "Add Section", exact: true }).click();
  await page
    .getByRole("button", { name: "Open content panel", exact: true })
    .click();
  await page.getByRole("button", { name: "Add Text", exact: true }).click();
  await selectBlock(page, "Select Text 1");
}

export function canvasField(page: Page, label: string) {
  const type =
    label === "Text content"
      ? "Text"
      : ["Heading", "Description"].includes(label)
        ? "Banner"
        : label === "Caption"
          ? "Image"
          : "Button";
  return page
    .frameLocator("iframe")
    .getByRole("group", { name: "Selected " + type + " block", exact: true })
    .getByRole("textbox", { name: label, exact: true });
}
export async function selectBlock(page: Page, name: string) {
  await page
    .getByRole("button", { name: "Open outline panel", exact: true })
    .click();
  await page.getByRole("button", { name, exact: true }).click();
}
export async function writeCanvas(page: Page, label: string, value: string) {
  const mobile = (page.viewportSize()?.width ?? 1280) <= 760;
  const styles = page.getByRole("button", {
    name: "Open settings panel",
    exact: true,
  });
  const restoreStyles =
    mobile && (await styles.getAttribute("aria-pressed")) === "true";
  const close = page.getByRole("button", { name: "Close panel", exact: true });
  if ((page.viewportSize()?.width ?? 1280) <= 760 && (await close.isVisible()))
    await close.click();
  const selected = canvasField(page, label);
  // Adding keeps blocks unselected; the test must click the new words to edit.
  const field = (await selected.count())
    ? selected
    : page
        .frameLocator("iframe")
        .getByRole("textbox", { name: label, exact: true })
        .last();
  await field.click();
  await field.fill(value);
  if (restoreStyles) await styles.click();
}
export async function setVisibility(page: Page, visibility: string) {
  await page
    .getByRole("button", { name: "Page settings", exact: true })
    .click();
  await page
    .getByLabel("Page visibility", { exact: true })
    .selectOption(visibility);
}
export async function addColumns(page: Page) {
  await page.getByRole("button", { name: "Add Columns", exact: true }).click();
  await page.getByRole("button", { name: "Apply layout", exact: true }).click();
}
export async function chooseAddTarget(page: Page, label: string) {
  await page
    .getByRole("button", { name: "Open content panel", exact: true })
    .click();
  await page.getByLabel("Add to", { exact: true }).selectOption({ label });
}
