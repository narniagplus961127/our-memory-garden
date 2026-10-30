import test from "node:test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL;
async function login(prefix = "ADMIN") {
  const r = await fetch(base + "/api/auth/sign-in/email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env["TEST_" + prefix + "_EMAIL"],
      password: process.env["TEST_" + prefix + "_PASSWORD"],
    }),
  });
  assert.equal(r.status, 200);
  return r.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
}
async function call(path, method = "GET", data, cookie) {
  return fetch(base + path, {
    method,
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
}
const text = (id, value) => ({
  type: "Text",
  props: { id, text: value, style: "p" },
});
const doc = (...content) => ({ root: { props: {} }, content });
async function fixture(content) {
  const owner = await login(),
    other = await login("OTHER");
  const page = await (
    await call("/api/pages", "POST", { title: "Concurrent garden" }, owner)
  ).json();
  const path = "/api/pages/" + page.id;
  const initial = await call(
    path,
    "PATCH",
    { title: page.title, content, version: page.version, visibility: "public" },
    owner,
  );
  assert.equal(initial.status, 200);
  return { owner, other, path, page: await initial.json() };
}
test("different-block edits merge from trusted saved revisions and are immediately public", async () => {
  const { owner, other, path, page } = await fixture(
    doc(text("a", "rose"), text("b", "lily")),
  );
  assert.equal(
    (
      await call(
        path,
        "PATCH",
        {
          title: page.title,
          content: doc(text("a", "fern"), text("b", "lily")),
          version: page.version,
        },
        owner,
      )
    ).status,
    200,
  );
  const second = await call(
    path,
    "PATCH",
    {
      title: page.title,
      content: doc(text("a", "rose"), text("b", "iris")),
      version: page.version,
    },
    other,
  );
  assert.equal(second.status, 200);
  const saved = await (await call(path)).json();
  assert.deepEqual(
    saved.content.content.map((b) => b.props.text),
    ["fern", "iris"],
  );
});

test("deletion against a changed descendant asks before discarding work", async () => {
  const section = (value) => ({
    type: "Section",
    props: {
      id: "section",
      background: "paper",
      spacing: "comfortable",
      content: [text("nested", value)],
    },
  });
  const { owner, other, path, page } = await fixture(
    doc(section("rose"), text("other", "unchanged")),
  );
  assert.equal(
    (
      await call(
        path,
        "PATCH",
        {
          content: doc(section("lily"), text("other", "unchanged")),
          version: page.version,
        },
        owner,
      )
    ).status,
    200,
  );
  const deleted = await call(
    path,
    "PATCH",
    { content: doc(text("other", "unchanged")), version: page.version },
    other,
  );
  assert.equal(deleted.status, 409);
  const conflict = await deleted.json();
  assert.ok(conflict.conflicts.some((c) => c.kind === "layout"));
  assert.match(JSON.stringify(conflict), /lily/);
  assert.deepEqual(
    (await (await call(path)).json()).content.content.map((b) => b.props.id),
    ["section", "other"],
  );
});

test("text choices retain independent title, privacy and intervening block edits, with an exact saved revision", async () => {
  const { owner, other, path, page } = await fixture(
    doc(text("a", "rose"), text("b", "old B")),
  );
  const saved = await (
    await call(
      path,
      "PATCH",
      {
        title: "A private new title",
        visibility: "private",
        content: doc(text("a", "lily"), text("b", "old B")),
        version: page.version,
      },
      owner,
    )
  ).json();
  const r = await call(
    path,
    "PATCH",
    {
      title: page.title,
      visibility: "public",
      content: doc(text("a", "fern"), text("b", "old B")),
      version: page.version,
    },
    other,
  );
  assert.equal(r.status, 409);
  const conflict = await r.json();
  assert.equal(conflict.kind, "conflict");
  assert.equal(conflict.draft.title, "A private new title");
  assert.equal(conflict.draft.visibility, "private");
  assert.equal(conflict.conflicts[0].local.props.text, "fern");
  assert.equal(conflict.conflicts[0].saved.props.text, "lily");
  await call(
    path,
    "PATCH",
    {
      content: doc(text("a", "lily"), text("b", "new B")),
      version: saved.version,
    },
    owner,
  );
  const resolved = await call(
    path,
    "PATCH",
    {
      ...conflict.draft,
      version: conflict.saved.version,
      reason: "resolution",
    },
    other,
  );
  assert.equal(resolved.status, 200);
  const final = await resolved.json();
  assert.equal(final.visibility, "private");
  assert.equal(final.title, "A private new title");
  assert.deepEqual(
    final.content.content.map((b) => b.props.text),
    ["fern", "new B"],
  );
  assert.equal((await call(path)).status, 404);
  assert.equal((await fetch(base + "/p/" + page.id)).status, 404);
  const postgres = (await import("postgres")).default;
  assert.equal(new URL(process.env.DATABASE_URL).hostname, "127.0.0.1");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const revisions =
      await sql`select version,snapshot from page_versions where page_id=${page.id} order by version`;
    const beforeChoice = revisions.find((v) => v.version === saved.version);
    assert.equal(beforeChoice.snapshot.content.content[0].props.text, "lily");
    assert.equal(beforeChoice.snapshot.visibility, "private");
    assert.equal(beforeChoice.snapshot.title, "A private new title");
    assert.ok(
      revisions.some(
        (v) => v.snapshot.content.content[1]?.props.text === "new B",
      ),
    );
  } finally {
    await sql.end();
  }
});

test("nested child edits merge without treating their shared containers as conflicts", async () => {
  const columns = (a, b) => ({
    type: "Columns",
    props: { id: "columns", left: [text("a", a)], right: [text("b", b)] },
  });
  const { owner, other, path, page } = await fixture(
    doc(columns("rose", "lily")),
  );
  assert.equal(
    (
      await call(
        path,
        "PATCH",
        { content: doc(columns("fern", "lily")), version: page.version },
        owner,
      )
    ).status,
    200,
  );
  const r = await call(
    path,
    "PATCH",
    { content: doc(columns("rose", "iris")), version: page.version },
    other,
  );
  assert.equal(r.status, 200);
  const block = (await r.json()).content.content[0];
  assert.equal(block.props.left[0].props.text, "fern");
  assert.equal(block.props.right[0].props.text, "iris");
});

test("insertions and one-sided moves preserve edits addressed by stable block ID", async () => {
  for (const move of [false, true]) {
    const { owner, other, path, page } = await fixture(
      doc(text("a", "A"), text("b", "B"), text("c", "C")),
    );
    const remote = move
      ? doc(text("c", "C"), text("a", "A"), text("b", "B"))
      : doc(text("x", "X"), text("a", "A"), text("b", "B"), text("c", "C"));
    await call(
      path,
      "PATCH",
      { content: remote, version: page.version },
      owner,
    );
    const r = await call(
      path,
      "PATCH",
      {
        content: doc(text("a", "A"), text("b", "edited B"), text("c", "C")),
        version: page.version,
      },
      other,
    );
    assert.equal(r.status, 200);
    const blocks = (await r.json()).content.content;
    assert.deepEqual(
      blocks.map((b) => b.props.id),
      move ? ["c", "a", "b"] : ["x", "a", "b", "c"],
    );
    assert.equal(blocks.find((b) => b.props.id === "b").props.text, "edited B");
  }
});

test("retrying a committed snapshot is idempotent and a fabricated historical base is rejected", async () => {
  const { owner, path, page } = await fixture(doc(text("a", "rose")));
  const update = { content: doc(text("a", "fern")), version: page.version };
  const first = await (await call(path, "PATCH", update, owner)).json();
  const retry = await call(path, "PATCH", update, owner);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).version, first.version);
  assert.equal(
    (
      await call(
        path,
        "PATCH",
        { ...update, version: 999999, base: { content: page.content } },
        owner,
      )
    ).status,
    409,
  );
});

test("a failed revision archive rolls back the entire page save", async () => {
  const { owner, path, page } = await fixture(doc(text("a", "rose")));
  const postgres = (await import("postgres")).default;
  assert.equal(new URL(process.env.DATABASE_URL).hostname, "127.0.0.1");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    await sql.unsafe(
      "create function garden_test_archive_failure() returns trigger language plpgsql as $$ begin if NEW.page_id = '" +
        page.id +
        "'::uuid then raise exception 'test archive failure'; end if; return NEW; end; $$",
    );
    await sql`create trigger garden_test_archive_failure before insert on page_versions for each row execute function garden_test_archive_failure()`;
    assert.equal(
      (
        await call(
          path,
          "PATCH",
          { content: doc(text("a", "must roll back")), version: page.version },
          owner,
        )
      ).status,
      500,
    );
    const unchanged = await (await call(path, "GET", undefined, owner)).json();
    assert.equal(unchanged.version, page.version);
    assert.equal(unchanged.content.content[0].props.text, "rose");
  } finally {
    await sql`drop trigger if exists garden_test_archive_failure on page_versions`;
    await sql`drop function if exists garden_test_archive_failure()`;
    await sql.end();
  }
});

test("an editor from a different signed-in account cannot submit its cached draft", async () => {
  const { owner, path, page } = await fixture(
    doc(text("a", "Account-bound text")),
  );
  const r = await call(
    path,
    "PATCH",
    {
      version: page.version,
      accountId: "another-account",
      content: doc(text("a", "Stale account draft")),
    },
    owner,
  );
  assert.equal(r.status, 401);
  assert.equal(
    (await (await call(path, "GET", undefined, owner)).json()).content
      .content[0].props.text,
    "Account-bound text",
  );
});

test("adjacent saves group for one editor while every exact revision remains available", async () => {
  const { owner, other, path, page } = await fixture(doc(text("a", "one")));
  const session = "grouping-editor";
  let saved = await (
    await call(
      path,
      "PATCH",
      {
        version: page.version,
        editorSessionId: session,
        content: doc(text("a", "two")),
      },
      owner,
    )
  ).json();
  const sameGroup = saved.edit_group_id;
  saved = await (
    await call(
      path,
      "PATCH",
      {
        version: saved.version,
        editorSessionId: session,
        content: doc(text("a", "three")),
      },
      owner,
    )
  ).json();
  assert.equal(saved.edit_group_id, sameGroup);
  saved = await (
    await call(
      path,
      "PATCH",
      {
        version: saved.version,
        editorSessionId: "another-editor",
        content: doc(text("a", "four")),
      },
      other,
    )
  ).json();
  assert.notEqual(saved.edit_group_id, sameGroup);
  const otherGroup = saved.edit_group_id;
  saved = await (
    await call(
      path,
      "PATCH",
      {
        version: saved.version,
        editorSessionId: "another-editor",
        reason: "resolution",
        content: doc(text("a", "five")),
      },
      other,
    )
  ).json();
  assert.notEqual(saved.edit_group_id, otherGroup);
  const postgres = (await import("postgres")).default;
  assert.equal(new URL(process.env.DATABASE_URL).hostname, "127.0.0.1");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const revisions =
      await sql`select snapshot from page_versions where page_id=${page.id} order by version`;
    assert.deepEqual(
      revisions.slice(-4).map((v) => v.snapshot.content.content[0].props.text),
      ["one", "two", "three", "four"],
    );
  } finally {
    await sql.end();
  }
});

test("concurrent accepted writes serialize and archive the exact displaced response", async () => {
  const { owner, other, path, page } = await fixture(
    doc(text("a", "old A"), text("b", "old B")),
  );
  const responses = await Promise.all([
    call(
      path,
      "PATCH",
      {
        version: page.version,
        content: doc(text("a", "new A"), text("b", "old B")),
      },
      owner,
    ),
    call(
      path,
      "PATCH",
      {
        version: page.version,
        content: doc(text("a", "old A"), text("b", "new B")),
      },
      other,
    ),
  ]);
  assert.deepEqual(
    responses.map((r) => r.status),
    [200, 200],
  );
  const results = await Promise.all(responses.map((r) => r.json()));
  assert.deepEqual(results.map((p) => p.version).sort(), [
    page.version + 1,
    page.version + 2,
  ]);
  const first = results.find((p) => p.version === page.version + 1);
  const final = await (await call(path)).json();
  assert.deepEqual(
    final.content.content.map((b) => b.props.text),
    ["new A", "new B"],
  );
  const postgres = (await import("postgres")).default;
  assert.equal(new URL(process.env.DATABASE_URL).hostname, "127.0.0.1");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  try {
    const [archived] =
      await sql`select snapshot from page_versions where page_id=${page.id} and version=${first.version}`;
    assert.deepEqual(archived.snapshot.content, first.content);
    assert.equal(archived.snapshot.updated_by, first.updated_by);
  } finally {
    await sql.end();
  }
});

test("moving into a deleted parent retains the edited subtree for an explicit layout choice", async () => {
  const section = (id, children) => ({
    type: "Section",
    props: { id, content: children },
  });
  const { owner, other, path, page } = await fixture(
    doc(
      section("left", [text("a", "old A")]),
      section("right", []),
      text("c", "old C"),
    ),
  );
  await call(
    path,
    "PATCH",
    {
      version: page.version,
      content: doc(section("left", [text("a", "old A")]), text("c", "new C")),
    },
    owner,
  );
  const r = await call(
    path,
    "PATCH",
    {
      version: page.version,
      content: doc(
        section("left", []),
        section("right", [text("a", "edited A")]),
        text("c", "old C"),
      ),
    },
    other,
  );
  assert.equal(r.status, 409);
  const conflict = await r.json();
  assert.ok(conflict.conflicts.some((c) => c.kind === "layout"));
  const resolved = await call(
    path,
    "PATCH",
    {
      ...conflict.draft,
      version: conflict.saved.version,
      reason: "resolution",
    },
    other,
  );
  assert.equal(resolved.status, 200);
  const final = await resolved.json();
  assert.equal(
    final.content.content[1].props.content[0].props.text,
    "edited A",
  );
  assert.equal(final.content.content[2].props.text, "new C");
});

test("a subtree deletion choice preserves an independent insertion in another section", async () => {
  const section = (id, children) => ({
    type: "Section",
    props: { id, content: children },
  });
  const { owner, other, path, page } = await fixture(
    doc(section("contested", [text("a", "old A")]), section("independent", [])),
  );
  await call(
    path,
    "PATCH",
    {
      version: page.version,
      content: doc(
        section("contested", [text("a", "new A")]),
        section("independent", [text("x", "Independent new X")]),
      ),
    },
    owner,
  );
  const r = await call(
    path,
    "PATCH",
    { version: page.version, content: doc(section("independent", [])) },
    other,
  );
  assert.equal(r.status, 409);
  const conflict = await r.json();
  const independent = conflict.draft.content.content.find(
    (b) => b.props.id === "independent",
  );
  assert.equal(independent.props.content[0]?.props.text, "Independent new X");
});
