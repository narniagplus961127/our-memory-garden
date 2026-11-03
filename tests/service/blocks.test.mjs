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
          textRich:
            '<h2 style="text-align: center; line-height: 1.8">A <strong>bold</strong> <span style="color: rgb(167, 91, 67); font-size: 28px; letter-spacing: 1.5px; font-family: Georgia">memory</span></h2>',
          style: "h2",
          backgroundColor: "#a7c4a0",
          padding: 24,
          paddingSides: { top: 12, right: 16, bottom: 20, left: 0 },
          marginSides: { top: 8, right: 4, bottom: 24, left: 12 },
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
  assert.ok(/font-size:\s*28px/.test(html), "Public font size is rendered");
  assert.ok(/font-family:\s*Georgia/.test(html), "Public font is rendered");
  assert.ok(/line-height:\s*1.8/.test(html), "Public line height is rendered");
  assert.ok(
    /letter-spacing:\s*1.5px/.test(html),
    "Public letter spacing is rendered",
  );
  assert.match(
    html,
    /padding-top:12px;padding-right:16px;padding-bottom:20px;padding-left:0/,
  );
  assert.match(
    html,
    /margin-top:8px;margin-right:4px;margin-bottom:24px;margin-left:12px/,
  );
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
    '<span style="color: red; position: fixed">Unsafe</span>',
    '<span style="color: url(https://example.com)">Unsafe</span>',
    '<span style="font-size: 999px">Unsafe</span>',
    '<span style="letter-spacing: -3px">Unsafe</span>',
    '<span style="color: #123456 !important">Unsafe</span>',
    '<span onclick="alert(1)">Unsafe</span>',
    '<span style="color: rgb(999, 0, 0)">Unsafe</span>',
    '<span style="font-family: url(https://example.com)">Unsafe</span>',
    '<span style="font-family: UnapprovedFont">Unsafe</span>',
    '<p style="line-height: 999">Unsafe</p>',
    '<p style="line-height: 1.8; position: fixed">Unsafe</p>',
  ]) {
    const invalid = structuredClone(content);
    invalid.content[0].props.textRich = bad;
    assert.equal((await update(invalid)).status, 400);
  }
  const invalid = structuredClone(content);
  invalid.content[0].props.backgroundColor = "url(https://example.com)";
  assert.equal((await update(invalid)).status, 400);
  for (const value of [
    { top: -1 },
    { left: 121 },
    { right: 1.5 },
    { top: "12" },
    { position: 1 },
    null,
    [],
  ]) {
    for (const key of ["paddingSides", "marginSides"]) {
      const badSpacing = structuredClone(content);
      badSpacing.content[0].props[key] = value;
      assert.equal((await update(badSpacing)).status, 400);
    }
  }
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
