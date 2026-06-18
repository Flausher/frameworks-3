const test = require("node:test");
const assert = require("node:assert/strict");
const { loadConfig } = require("../src/config/loadConfig");
const { validateConfig } = require("../src/config/validateConfig");
const { printStartupErrors } = require("../src/server");

test("config source priority is file < env < cli for operational params", () => {
  const result = loadConfig({
    cwd: process.cwd(),
    argv: ["--port=4300"],
    env: {
      APP_MODE: "production",
      PORT: "4200",
      TRUSTED_ORIGINS: "http://env.local:3000",
      RATE_LIMIT_READ_MAX: "77"
    }
  });

  assert.equal(result.config.mode, "production");
  assert.equal(result.config.port, 4300);
  assert.deepEqual(result.config.trustedOrigins, ["http://env.local:3000"]);
  assert.equal(result.config.rateLimit.readMax, 77);
});

test("mode is controlled by configuration, CLI mode is ignored", () => {
  const result = loadConfig({
    cwd: process.cwd(),
    argv: ["--mode=learning"],
    env: {
      APP_MODE: "production"
    }
  });

  assert.equal(result.config.mode, "production");
});

test("invalid config is detected before server start", () => {
  const validation = validateConfig({
    mode: "production",
    port: 70000,
    trustedOrigins: ["not-an-origin"],
    rateLimit: {
      windowMs: -1,
      readMax: 0,
      createMax: 1
    }
  });

  assert.equal(validation.ok, false);
  assert.ok(validation.errors.length >= 3);
});

test("learning mode prints detailed startup errors", () => {
  const lines = [];
  const original = console.error;
  console.error = (line) => {
    lines.push(String(line));
  };

  try {
    printStartupErrors("learning", ["port invalid", "origin invalid"]);
  } finally {
    console.error = original;
  }

  assert.equal(lines[0], "Configuration errors:");
  assert.equal(lines[1], "- port invalid");
  assert.equal(lines[2], "- origin invalid");
});

test("production mode prints minimal startup error", () => {
  const lines = [];
  const original = console.error;
  console.error = (line) => {
    lines.push(String(line));
  };

  try {
    printStartupErrors("production", ["port invalid"]);
  } finally {
    console.error = original;
  }

  assert.deepEqual(lines, ["Invalid configuration"]);
});