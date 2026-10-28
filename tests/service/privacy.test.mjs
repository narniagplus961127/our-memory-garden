import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
async function login(email, password) {
  const response = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200);
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
async function call(path, method = "GET", data, cookie, origin = base) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}
test("private-page data is restricted to the provisioned administrators", async () => {
  const cookie = await login(
    process.env.TEST_ADMIN_EMAIL,
    process.env.TEST_ADMIN_PASSWORD,
  );
  const created = await call(
    "/api/pages",
    "POST",
    { title: "A private memory" },
    cookie,
  );
  assert.equal(created.status, 201);
  const page = await created.json();
  assert.equal(page.visibility, "private");
  assert.equal((await call("/api/pages/" + page.id)).status, 404);
  assert.equal((await call("/api/pages")).status, 401);
  assert.equal(
    (
      await call("/api/pages/" + page.id, "PATCH", {
        title: "Intrusion",
        text: "No",
        version: 1,
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await call(
        "/api/pages",
        "POST",
        { title: "Wrong origin" },
        cookie,
        "https://example.net",
      )
    ).status,
    403,
  );
  const other = await login(
    process.env.TEST_OTHER_EMAIL,
    process.env.TEST_OTHER_PASSWORD,
  );
  const edited = await call(
    "/api/pages/" + page.id,
    "PATCH",
    {
      title: "A private memory",
      text: "Both gardeners can tend this page.",
      version: 1,
    },
    other,
  );
  assert.equal(edited.status, 200);
  assert.equal(
    (
      await (
        await call("/api/pages/" + page.id, "GET", undefined, cookie)
      ).json()
    ).content.content[0].props.text,
    "Both gardeners can tend this page.",
  );
  const stale = await call(
    "/api/pages/" + page.id,
    "PATCH",
    { title: "A private memory", text: "Stale replacement", version: 1 },
    cookie,
  );
  assert.equal(stale.status, 409);
});
test("public registration is unavailable and non-administrators cannot sign in to the garden", async () => {
  assert.equal(
    (
      await call("/api/auth/sign-up/email", "POST", {
        email: "another@garden.test",
        password: "not-a-real-account",
        name: "Another",
      })
    ).status,
    404,
  );
  const response = await call("/api/auth/sign-in/email", "POST", {
    email: process.env.TEST_OUTSIDER_EMAIL,
    password: process.env.TEST_OUTSIDER_PASSWORD,
  });
  assert.equal(response.status, 401);
  const missing = await call("/api/auth/request-password-reset", "POST", {
    email: "missing@garden.test",
  });
  assert.equal(missing.status, 200);
  assert.deepEqual(await missing.json(), { status: true });
});
