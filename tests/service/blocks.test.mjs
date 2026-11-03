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

test("explicit rich text and custom colours round-trip, while legacy markup stays literal and unsafe formatting is rejected", async () => {
  const cookie = await login();
  let page = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Formatted garden " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Text",
        props: {
          id: "formatted",
          text: "A bold memory",
          textRich: "<h2>A <strong>bold</strong> memory</h2>",
          style: "h2",
          backgroundColor: "#a7c4a0",
          padding: 24,
          radius: 8,
        },
      },
      {
        type: "Text",
        props: {
          id: "literal",
          text: "<img src=x onerror=alert(1)> is our literal note",
          style: "p",
        },
      },
      {
        type: "Text",
        props: {
          id: "small-link",
          text: "A little path",
          style: "small",
          linkText: "path",
          destination: { kind: "external", url: "https://example.com/garden" },
        },
      },
    ],
  };
  const update = (data) =>
    call(
      "/api/pages/" + page.id,
      "PATCH",
      { content: data, visibility: "public", version: page.version },
      cookie,
    );
  let response = await update(content);
  assert.equal(response.status, 200);
  page = await response.json();
  assert.deepEqual(page.content, content);
  const html = await (await fetch(base + "/p/" + page.id)).text();
  assert.match(html, /<strong>bold<\/strong>/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(
    html,
    /<small>A little <\/small><a href="https:\/\/example.com\/garden"><small>path<\/small><\/a>/,
  );
  for (const bad of [
    "<img src=x onerror=alert(1)>",
    '<p onclick="alert(1)">Memory</p>',
    '<a href="javascript:alert(1)">Unsafe</a>',
    '<p style="background:url(https://example.com)">Unsafe</p>',
    "<h5>Unsupported</h5>",
    "<svg><script>alert(1)</script></svg>",
  ]) {
    const invalid = structuredClone(content);
    invalid.content[0].props.textRich = bad;
    assert.equal((await update(invalid)).status, 400);
  }
  const invalid = structuredClone(content);
  invalid.content[0].props.backgroundColor = "url(https://example.com)";
  assert.equal((await update(invalid)).status, 400);
  const nestedButtonLink = {
    root: { props: {} },
    content: [
      {
        type: "Button",
        props: {
          id: "button-link",
          label: "Go",
          href: "https://example.com",
          labelRich: '<p><a href="https://example.com">Go</a></p>',
        },
      },
    ],
  };
  assert.equal((await update(nestedButtonLink)).status, 400);
  assert.deepEqual(
    (await (await fetch(base + "/api/pages/" + page.id)).json()).content,
    content,
  );
});
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

test("three and four column pages retain every nested block and reject hidden column content", async () => {
  const cookie = await login();
  let page = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Four garden paths " + crypto.randomUUID() },
      cookie,
    )
  ).json();
  const text = (id, value) => ({
    type: "Text",
    props: { id, text: value, style: "p" },
  });
  const content = {
    root: { props: {} },
    content: [
      {
        type: "Columns",
        props: {
          id: "paths",
          count: 4,
          ratio: "equal",
          gap: "comfortable",
          left: [text("one", "First path")],
          right: [text("two", "Second path")],
          third: [text("three", "Third path")],
          fourth: [text("four", "Fourth path")],
        },
      },
    ],
  };
  let response = await call(
    "/api/pages/" + page.id,
    "PATCH",
    { content, visibility: "public", version: page.version },
    cookie,
  );
  assert.equal(response.status, 200);
  page = await response.json();
  assert.deepEqual(page.content, content);
  const html = await (await fetch(base + "/p/" + page.id)).text();
  for (const value of [
    "First path",
    "Second path",
    "Third path",
    "Fourth path",
  ])
    assert.ok(html.includes(value));
  const invalid = structuredClone(content);
  invalid.content[0].props.count = 2;
  assert.equal(
    (
      await call(
        "/api/pages/" + page.id,
        "PATCH",
        { content: invalid, version: page.version },
        cookie,
      )
    ).status,
    400,
  );
});
