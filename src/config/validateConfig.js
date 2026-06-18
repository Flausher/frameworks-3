function isPositiveInt(value) {
  return Number.isInteger(value) && value > 0;
}

function isValidHttpOrigin(value) {
  if (typeof value !== "string" || value.length === 0) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateConfig(config) {
  const errors = [];
  const allowedModes = ["learning", "production"];

  if (!allowedModes.includes(config.mode)) {
    errors.push("mode must be learning or production");
  }

  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    errors.push("port must be an integer in range 1..65535");
  }

  if (!Array.isArray(config.trustedOrigins) || config.trustedOrigins.length === 0) {
    errors.push("trustedOrigins must be a non-empty array");
  } else {
    const badOrigin = config.trustedOrigins.find((origin) => !isValidHttpOrigin(origin));
    if (badOrigin) {
      errors.push(`trusted origin is invalid: ${badOrigin}`);
    }
  }

  if (!config.rateLimit || typeof config.rateLimit !== "object") {
    errors.push("rateLimit must be an object");
  } else {
    if (!isPositiveInt(config.rateLimit.windowMs)) {
      errors.push("rateLimit.windowMs must be a positive integer");
    }

    if (!isPositiveInt(config.rateLimit.readMax)) {
      errors.push("rateLimit.readMax must be a positive integer");
    }

    if (!isPositiveInt(config.rateLimit.createMax)) {
      errors.push("rateLimit.createMax must be a positive integer");
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}

module.exports = {
  validateConfig
};