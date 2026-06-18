const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../src/app");

function makeConfig(overrides = {}) {
  return {
    mode: "learning",
    port: 3000,
    trustedOrigins: ["http://trusted.local"],
    rateLimit: {
      windowMs: 60000,
      readMax: 2,
      createMax: 1
    },
    ...overrides
  };
}

test("blocks request from untrusted origin", async () => {
  const app = createApp(makeConfig());
  const res = await request(app)
    .get("/health")
    .set("Origin", "http://evil.local");

  assert.equal(res.status, 403);
  assert.equal(res.body.error, "origin_forbidden");
});

test("allows request from trusted origin and sets CORS header", async () => {
  const app = createApp(makeConfig());
  const res = await request(app)
    .get("/health")
    .set("Origin", "http://trusted.local");

  assert.equal(res.status, 200);
  assert.equal(res.headers["access-control-allow-origin"], "http://trusted.local");
});

test("applies lower POST limit than GET limit", async () => {
  const app = createApp(makeConfig());

  const firstCreate = await request(app)
    .post("/items")
    .send({ name: "one" });
  assert.equal(firstCreate.status, 201);

  const secondCreate = await request(app)
    .post("/items")
    .send({ name: "two" });
  assert.equal(secondCreate.status, 429);

  const firstRead = await request(app).get("/items");
  const secondRead = await request(app).get("/items");
  const thirdRead = await request(app).get("/items");
  assert.equal(firstRead.status, 200);
  assert.equal(secondRead.status, 200);
  assert.equal(thirdRead.status, 429);
});

test("sets security headers", async () => {
  const app = createApp(makeConfig());
  const res = await request(app).get("/health");

  assert.equal(res.headers["x-frame-options"], "DENY");
  assert.equal(res.headers["cache-control"], "no-store");
  assert.equal(res.headers["x-content-type-options"], "nosniff");
});

test("learning mode returns detailed limit message", async () => {
  const app = createApp(makeConfig({ mode: "learning" }));

  await request(app).post("/items").send({ name: "one" });
  const res = await request(app).post("/items").send({ name: "two" });

  assert.equal(res.status, 429);
  assert.equal(typeof res.body.details, "string");
  assert.ok(res.body.details.includes("Limit"));
});

test("production mode returns minimal limit message", async () => {
  const app = createApp(makeConfig({ mode: "production" }));

  await request(app).post("/items").send({ name: "one" });
  const res = await request(app).post("/items").send({ name: "two" });

  assert.equal(res.status, 429);
  assert.equal(res.body.error, "rate_limit_exceeded");
  assert.equal(res.body.details, undefined);
});

test("learning mode writes request logs", async () => {
  const app = createApp(makeConfig({ mode: "learning" }));
  const calls = [];
  const originalLog = console.log;
  console.log = (...args) => {
    calls.push(args.join(" "));
  };

  try {
    await request(app).get("/health");
  } finally {
    console.log = originalLog;
  }

  assert.ok(calls.some((line) => line.includes("[learning] GET /health -> 200")));
});

test("production mode does not write request logs", async () => {
  const app = createApp(makeConfig({ mode: "production" }));
  const calls = [];
  const originalLog = console.log;
  console.log = (...args) => {
    calls.push(args.join(" "));
  };

  try {
    await request(app).get("/health");
  } finally {
    console.log = originalLog;
  }

  assert.equal(calls.length, 0);
});