const fs = require("node:fs");
const path = require("node:path");
const { parseCliArgs } = require("../utils/parseCliArgs");

function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function parseNumber(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseOrigins(value, fallback) {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function ensureRateLimit(input) {
  const safe = input && typeof input === "object" ? input : {};
  return {
    windowMs: parseNumber(safe.windowMs, undefined),
    readMax: parseNumber(safe.readMax, undefined),
    createMax: parseNumber(safe.createMax, undefined)
  };
}

function pickMode(baseMode, envMode) {
  if (envMode !== undefined) return envMode;
  return baseMode;
}

function loadConfig(options = {}) {
  const cwd = options.cwd || process.cwd();
  const argv = options.argv || process.argv.slice(2);
  const env = options.env || process.env;

  const configPath = path.join(cwd, "config", "default.json");
  const fromFile = readJsonFile(configPath);
  const cli = parseCliArgs(argv);

  const fromEnv = {
    mode: env.APP_MODE,
    port: parseNumber(env.PORT, undefined),
    trustedOrigins: parseOrigins(env.TRUSTED_ORIGINS, undefined),
    rateLimit: {
      windowMs: parseNumber(env.RATE_LIMIT_WINDOW_MS, undefined),
      readMax: parseNumber(env.RATE_LIMIT_READ_MAX, undefined),
      createMax: parseNumber(env.RATE_LIMIT_CREATE_MAX, undefined)
    }
  };

  const fromCli = {
    port: parseNumber(cli.port, undefined),
    trustedOrigins: parseOrigins(cli.trustedOrigins, undefined),
    rateLimit: {
      windowMs: parseNumber(cli.rateLimitWindowMs, undefined),
      readMax: parseNumber(cli.rateLimitReadMax, undefined),
      createMax: parseNumber(cli.rateLimitCreateMax, undefined)
    }
  };

  const selectedMode = pickMode(fromFile.mode, fromEnv.mode);
  const modeProfiles = fromFile.modeProfiles && typeof fromFile.modeProfiles === "object"
    ? fromFile.modeProfiles
    : {};
  const selectedProfile = modeProfiles[selectedMode] && typeof modeProfiles[selectedMode] === "object"
    ? modeProfiles[selectedMode]
    : {};
  const profileRate = ensureRateLimit(selectedProfile.rateLimit);
  const fileRate = ensureRateLimit(fromFile.rateLimit);

  const merged = {
    mode: selectedMode,
    port: fromFile.port,
    trustedOrigins: fromFile.trustedOrigins,
    verboseErrors: typeof selectedProfile.verboseErrors === "boolean"
      ? selectedProfile.verboseErrors
      : selectedMode === "learning",
    rateLimit: {
      windowMs: fileRate.windowMs !== undefined ? fileRate.windowMs : profileRate.windowMs,
      readMax: fileRate.readMax !== undefined ? fileRate.readMax : profileRate.readMax,
      createMax: fileRate.createMax !== undefined ? fileRate.createMax : profileRate.createMax
    }
  };

  if (fromEnv.port !== undefined) merged.port = fromEnv.port;
  if (fromEnv.trustedOrigins !== undefined) merged.trustedOrigins = fromEnv.trustedOrigins;
  if (fromEnv.rateLimit.windowMs !== undefined) merged.rateLimit.windowMs = fromEnv.rateLimit.windowMs;
  if (fromEnv.rateLimit.readMax !== undefined) merged.rateLimit.readMax = fromEnv.rateLimit.readMax;
  if (fromEnv.rateLimit.createMax !== undefined) merged.rateLimit.createMax = fromEnv.rateLimit.createMax;

  if (fromCli.port !== undefined) merged.port = fromCli.port;
  if (fromCli.trustedOrigins !== undefined) merged.trustedOrigins = fromCli.trustedOrigins;
  if (fromCli.rateLimit.windowMs !== undefined) merged.rateLimit.windowMs = fromCli.rateLimit.windowMs;
  if (fromCli.rateLimit.readMax !== undefined) merged.rateLimit.readMax = fromCli.rateLimit.readMax;
  if (fromCli.rateLimit.createMax !== undefined) merged.rateLimit.createMax = fromCli.rateLimit.createMax;

  return {
    config: merged,
    sources: {
      file: fromFile,
      env: fromEnv,
      cli: fromCli
    }
  };
}

module.exports = {
  loadConfig
};