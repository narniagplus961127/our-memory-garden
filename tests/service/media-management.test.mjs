import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
const base = process.env.TEST_BASE_URL;
export async function call(path, method = "GET", data, cookie) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
export async function login(prefix = "ADMIN") {
  const r = await call("/api/auth/sign-in/email", "POST", {
    email: process.env["TEST_" + prefix + "_EMAIL"],
    password: process.env["TEST_" + prefix + "_PASSWORD"],
  });
  assert.equal(r.status, 200);
  return r.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
}
export async function photo(
  cookie,
  name = "library-flower.png",
  suppliedBytes,
) {
  const bytes =
    suppliedBytes ??
    (await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#769270" },
    })
      .png()
      .toBuffer());
  const upload = await (
    await call(
      "/api/media/uploads",
      "POST",
      { name, size: bytes.length, type: "image/png" },
      cookie,
    )
  ).json();
  assert.equal(
    (
      await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: bytes,
      })
    ).status,
    200,
  );
  const r = await call(
    "/api/media/" + upload.id + "/complete",
    "POST",
    {},
    cookie,
  );
  assert.equal(r.status, 200);
  return { ...(await r.json()), bytes };
}
test("unused photos require confirmation and disappear only after successful deletion", async () => {
  const cookie = await login();
  const p = await photo(cookie);
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true })).status,
    401,
  );
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", {}, cookie)).status,
    400,
  );
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
      .status,
    200,
  );
  assert.equal(
    (await call("/api/media/" + p.id, "GET", undefined, cookie)).status,
    404,
  );
});
test("a referenced photo cannot be deleted and concurrent save versus delete never leaves a broken page", async () => {
  const cookie = await login();
  for (let round = 0; round < 3; round++) {
    const p = await photo(cookie, "race-flower.png");
    const page = await (
      await call("/api/pages", "POST", { title: "Shared flower" }, cookie)
    ).json();
    const content = {
      root: { props: {} },
      content: [
        {
          type: "Gallery",
          props: {
            id: "race-gallery",
            photos: [{ photoId: p.id, caption: "Our flower" }],
          },
        },
      ],
    };
    const save = () =>
      call(
        "/api/pages/" + page.id,
        "PATCH",
        { title: page.title, version: page.version, content },
        cookie,
      );
    if (round === 0) {
      assert.equal((await save()).status, 200);
      assert.equal(
        (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
          .status,
        409,
      );
      const details = await (
        await call("/api/media/" + p.id, "GET", undefined, cookie)
      ).json();
      assert.ok(details.usages.some((u) => u.id === page.id));
    } else {
      const [saved, deleted] = await Promise.all([
        save(),
        call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie),
      ]);
      if (saved.status === 200) {
        assert.equal(deleted.status, 409);
        assert.equal(
          (
            await call(
              "/api/media/" + p.id + "/original",
              "GET",
              undefined,
              cookie,
            )
          ).status,
          200,
        );
      } else {
        assert.equal(deleted.status, 200);
        assert.ok([400, 409].includes(saved.status));
      }
    }
  }
});
test("partial storage deletion retains a guarded unfinished operation and retry finishes cleanup", async () => {
  const cookie = await login();
  const p = await photo(cookie, "partial-cleanup.png");
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  assert.equal(
    (
      await fetch(endpoint + "/__fixture/fail-display-delete", {
        method: "PUT",
      })
    ).status,
    204,
  );
  try {
    assert.equal(
      (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
        .status,
      503,
    );
    const details = await (
      await call("/api/media/" + p.id, "GET", undefined, cookie)
    ).json();
    assert.equal(details.deletionPending, true);
    assert.equal(
      (await call("/api/media/" + p.id + "/complete", "POST", {}, cookie))
        .status,
      409,
    );
    assert.match(details.deletionError, /incomplete/i);
    assert.equal(
      (await call("/api/media/" + p.id + "/original", "GET", undefined, cookie))
        .status,
      404,
    );
    const page = await (
      await call("/api/pages", "POST", { title: "No partial photos" }, cookie)
    ).json();
    assert.equal(
      (
        await call(
          "/api/pages/" + page.id,
          "PATCH",
          {
            title: page.title,
            version: page.version,
            content: {
              root: { props: {} },
              content: [
                {
                  type: "Image",
                  props: {
                    id: "pending-deletion",
                    photoId: p.id,
                    alt: "Unavailable",
                  },
                },
              ],
            },
          },
          cookie,
        )
      ).status,
      400,
    );
  } finally {
    await fetch(endpoint + "/__fixture/fail-display-delete", {
      method: "DELETE",
    });
  }
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
      .status,
    200,
  );
  assert.equal(
    (await call("/api/media/" + p.id, "GET", undefined, cookie)).status,
    404,
  );
});
test("storage reports measured object categories, physical database bytes, sources and freshness without invented quotas", async () => {
  assert.equal((await call("/api/storage")).status, 401);
  const cookie = await login();
  const before = Date.now();
  const response = await call("/api/storage", "GET", undefined, cookie);
  assert.equal(response.status, 200);
  const usage = await response.json();
  assert.ok(usage.total > 0);
  assert.equal(
    usage.total,
    usage.originals + usage.display + usage.archives + usage.staging,
  );
  assert.ok(usage.databaseBytes > 0);
  assert.match(usage.databaseSource, /pg_database_size/);
  assert.match(usage.source, /bucket listing/);
  assert.ok(new Date(usage.measuredAt).getTime() >= before);
  assert.equal(usage.quota, null);
  assert.equal(usage.plan, null);
});
test("a genuine non-administrator session cannot inspect storage or delete shared photos", async () => {
  const { betterAuth } = await import("better-auth");
  const { localAuthOptions } =
    await import("../../src/lib/server/local-auth.ts");
  const options = localAuthOptions();
  try {
    const r = await betterAuth(options).api.signInEmail({
      body: {
        email: process.env.TEST_OUTSIDER_EMAIL,
        password: process.env.TEST_OUTSIDER_PASSWORD,
      },
      asResponse: true,
    });
    assert.equal(r.status, 200);
    const cookie = r.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; ");
    assert.equal(
      (await call("/api/storage", "GET", undefined, cookie)).status,
      401,
    );
    assert.equal(
      (
        await call(
          "/api/media/" + crypto.randomUUID(),
          "DELETE",
          { confirm: true },
          cookie,
        )
      ).status,
      401,
    );
  } finally {
    await options.database.end();
  }
});
test("history-only photos are deletable after removal without deleting the page or granting public access", async () => {
  const cookie = await login(),
    p = await photo(cookie, "historical-flower.png");
  let page = await (
    await call("/api/pages", "POST", { title: "Retained photo story" }, cookie)
  ).json();
  let response = await call(
    "/api/pages/" + page.id,
    "PATCH",
    {
      title: page.title,
      version: page.version,
      visibility: "public",
      content: {
        root: { props: {} },
        content: [
          {
            type: "Image",
            props: {
              id: "history-image",
              photoId: p.id,
              alt: "Retained flower",
            },
          },
        ],
      },
    },
    cookie,
  );
  assert.equal(response.status, 200);
  page = await response.json();
  const photoVersion = page.version;
  response = await call(
    "/api/pages/" + page.id,
    "PATCH",
    { title: page.title + " revised", version: page.version },
    cookie,
  );
  assert.equal(response.status, 200);
  page = await response.json();
  assert.equal(
    (await (await call("/api/media/" + p.id, "GET", undefined, cookie)).json())
      .usages.length,
    1,
  );
  assert.equal(
    (
      await call(
        "/api/pages/" + page.id,
        "PATCH",
        {
          title: page.title,
          version: page.version,
          content: { root: { props: {} }, content: [] },
        },
        cookie,
      )
    ).status,
    200,
  );
  const details = await (
    await call("/api/media/" + p.id, "GET", undefined, cookie)
  ).json();
  assert.equal(details.usages.length, 0);
  assert.equal(details.publiclyAccessible, false);
  assert.equal((await call("/api/media/" + p.id + "/display")).status, 404);
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
      .status,
    200,
  );
  assert.equal(
    (await call("/api/media/" + p.id + "/original", "GET", undefined, cookie))
      .status,
    404,
  );
  const before = await (
    await call("/api/pages/" + page.id, "GET", undefined, cookie)
  ).json();
  assert.equal(
    (
      await call(
        "/api/pages/" + page.id + "/history/" + photoVersion,
        "POST",
        { confirm: true, version: before.version },
        cookie,
      )
    ).status,
    409,
  );
  assert.deepEqual(
    (
      await (
        await call("/api/pages/" + page.id, "GET", undefined, cookie)
      ).json()
    ).content,
    before.content,
  );
});
test("history can restore available photos while current trash references still protect them", async () => {
  const cookie = await login(),
    p = await photo(cookie, "restorable-byte-retention.png");
  let page = await (
    await call(
      "/api/pages",
      "POST",
      { title: "Retained recovery photograph" },
      cookie,
    )
  ).json();
  let response = await call(
    "/api/pages/" + page.id,
    "PATCH",
    {
      version: page.version,
      visibility: "public",
      content: {
        root: { props: {} },
        content: [
          {
            type: "Image",
            props: {
              id: "recovery-photo",
              photoId: p.id,
              alt: "Recoverable photo",
            },
          },
        ],
      },
    },
    cookie,
  );
  assert.equal(response.status, 200);
  page = await response.json();
  const photoVersion = page.version;
  response = await call(
    "/api/pages/" + page.id,
    "PATCH",
    { version: page.version, content: { root: { props: {} }, content: [] } },
    cookie,
  );
  assert.equal(response.status, 200);
  page = await response.json();
  assert.deepEqual(
    (await (await call("/api/media/" + p.id, "GET", undefined, cookie)).json())
      .usages,
    [],
  );
  response = await call(
    "/api/pages/" + page.id + "/history/" + photoVersion,
    "POST",
    { confirm: true, version: page.version },
    cookie,
  );
  assert.equal(response.status, 200, await response.clone().text());
  page = await response.json();
  assert.equal(page.visibility, "public");
  assert.equal((await call("/api/media/" + p.id + "/display")).status, 200);
  async function change(action) {
    const response = await call(
      "/api/pages/" + page.id + "/trash",
      "POST",
      { confirm: true, action, version: page.version },
      cookie,
    );
    assert.equal(response.status, 200, await response.clone().text());
    return response.json();
  }
  page = await change("trash");
  assert.equal((await call("/api/media/" + p.id + "/display")).status, 404);
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
      .status,
    409,
  );
  page = await change("restore");
  assert.equal(page.visibility, "private");
  assert.equal((await call("/api/media/" + p.id + "/display")).status, 404);
  const original = await call(
    "/api/media/" + p.id + "/original",
    "GET",
    undefined,
    cookie,
  );
  assert.equal(original.status, 200);
  assert.deepEqual(Buffer.from(await original.arrayBuffer()), p.bytes);
  page = await change("trash");
  await change("delete");
  const details = await (
    await call("/api/media/" + p.id, "GET", undefined, cookie)
  ).json();
  assert.deepEqual(details.usages, []);
  assert.equal(
    (await call("/api/media/" + p.id + "/original", "GET", undefined, cookie))
      .status,
    200,
    "Permanent page deletion does not delete media automatically",
  );
  assert.equal(
    (await call("/api/media/" + p.id, "DELETE", { confirm: true }, cookie))
      .status,
    200,
  );
});

test("garden export creation, preparation and downloads are removed", async () => {
  const cookie = await login();
  const id = crypto.randomUUID();
  for (const auth of [undefined, cookie]) {
    for (const [path, method] of [
      ["/api/exports", "GET"],
      ["/api/exports", "POST"],
      ["/api/exports/" + id, "GET"],
      ["/api/exports/" + id, "DELETE"],
      ["/api/exports/" + id + "/prepare", "POST"],
      ["/api/exports/" + id + "/manifest", "GET"],
      ["/api/exports/" + id + "/parts/" + id + "/download", "GET"],
      ["/api/exports/" + id + "/parts/" + id + "/download", "HEAD"],
    ]) {
      assert.equal(
        (await call(path, method, method === "POST" ? {} : undefined, auth))
          .status,
        404,
        path,
      );
    }
  }
});
