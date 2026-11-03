import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL;
async function login() {
  const r = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
    }),
  });
  assert.equal(r.status, 200);
  return r.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
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
    body: data ? JSON.stringify(data) : undefined,
  });
}
test("page title presentation merges with concurrent content, restores with history and rejects unsupported root settings", async () => {
  const cookie = await login();
  let original = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Title presentation " + Date.now() },
      cookie,
    )
  ).json();
  const path = "/api/pages/" + original.id;
  original = await (
    await call(
      path,
      "PATCH",
      {
        version: original.version,
        content: {
          root: { props: {} },
          content: [
            {
              type: "Text",
              props: { id: "historic-text", text: "", style: "p" },
            },
          ],
        },
      },
      cookie,
    )
  ).json();
  const hidden = structuredClone(original.content);
  hidden.root.props.showTitle = false;
  let r = await call(
    path,
    "PATCH",
    { version: original.version, content: hidden },
    cookie,
  );
  assert.equal(r.status, 200);
  const first = await r.json();
  // An older tab editing words must preserve a newer title-visibility choice.
  const edited = structuredClone(original.content);
  edited.content[0].props.text = "A concurrent memory";
  r = await call(
    path,
    "PATCH",
    { version: original.version, content: edited },
    cookie,
  );
  assert.equal(r.status, 200);
  let current = await r.json();
  assert.equal(current.content.root.props.showTitle, false);
  assert.equal(current.content.content[0].props.text, "A concurrent memory");
  const shown = structuredClone(current.content);
  shown.root.props.showTitle = true;
  r = await call(
    path,
    "PATCH",
    { version: current.version, content: shown },
    cookie,
  );
  assert.equal(r.status, 200);
  current = await r.json();
  r = await call(
    path + "/history/" + first.version,
    "POST",
    { version: current.version, confirm: true },
    cookie,
  );
  assert.equal(r.status, 200);
  current = await r.json();
  assert.equal(current.content.root.props.showTitle, false);
  for (const props of [
    { showTitle: "false" },
    { showTitle: null },
    { showTitle: 0 },
    { display: "none" },
  ]) {
    const bad = structuredClone(current.content);
    bad.root.props = props;
    assert.equal(
      (
        await call(
          path,
          "PATCH",
          { version: current.version, content: bad },
          cookie,
        )
      ).status,
      400,
    );
  }
  r = await call(
    path + "/history/" + original.version,
    "POST",
    { version: current.version, confirm: true },
    cookie,
  );
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).content.root.props, {});
});
