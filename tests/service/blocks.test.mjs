import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
async function login() {
  const response = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
    }),
  });
  assert.equal(response.status, 200);
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
async function call(path, method, data, cookie) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(data),
  });
}
test("nested visual blocks persist, render publicly and reject invalid descendant documents", async () => {
  const cookie = await login();
  let page = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Nested garden " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Section",
        props: {
          id: "section-1",
          background: "sage",
          spacing: "comfortable",
          content: [
            {
              type: "Columns",
              props: {
                id: "columns-1",
                ratio: "equal",
                gap: "comfortable",
                left: [
                  {
                    type: "Text",
                    props: {
                      id: "text-1",
                      text: "Our nested rosemary",
                      style: "h2",
                    },
                  },
                ],
                right: [
                  {
                    type: "Button",
                    props: {
                      id: "button-1",
                      label: "Visit the garden",
                      href: "https://example.com",
                      variant: "primary",
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
  let response = await call(
    "/api/pages/" + page.id,
    "PATCH",
    { title: page.title, content, visibility: "public", version: page.version },
    cookie,
  );
  assert.equal(response.status, 200);
  page = await response.json();
  assert.deepEqual(page.content, content);
  const html = await (await fetch(base + "/p/" + page.id)).text();
  assert.match(html, /<h2[^>]*>Our nested rosemary<\/h2>/);
  assert.match(html, /Visit the garden/);
  for (const change of [
    (d) => (d.content[0].props.content[0].props.left[0].type = "Script"),
    (d) => (d.content[0].props.content[0].props.left[0].props.id = "section-1"),
    (d) =>
      (d.content[0].props.content[0].props.right[0].props.href =
        "javascript:alert(1)"),
    (d) => (d.content[0].props.content[0].props.left = "not a slot"),
    (d) => (d.content[0].props.content[0].props.left[0].props.style = "script"),
  ]) {
    const invalid = structuredClone(content);
    change(invalid);
    response = await call(
      "/api/pages/" + page.id,
      "PATCH",
      { title: page.title, content: invalid, version: page.version },
      cookie,
    );
    assert.equal(response.status, 400);
  }
  assert.deepEqual(
    (await (await fetch(base + "/api/pages/" + page.id)).json()).content,
    content,
  );
});
