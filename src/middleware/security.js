function makeCorsMiddleware(trustedOrigins, verboseErrors) {
  const allowed = new Set(trustedOrigins);

  return function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;

    if (!origin) {
      return next();
    }

    if (!allowed.has(origin)) {
      const payload = verboseErrors
        ? { error: "origin_forbidden", details: `Origin ${origin} is not trusted` }
        : { error: "origin_forbidden" };
      return res.status(403).json(payload);
    }

    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }

    return next();
  };
}

function securityHeadersMiddleware(req, res, next) {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
}

function makeRequestLogger(enabled) {
  return function requestLogger(req, res, next) {
    if (!enabled) {
      return next();
    }

    const startedAt = process.hrtime.bigint();
    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      console.log(
        `[learning] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${durationMs.toFixed(1)}ms`
      );
    });

    return next();
  };
}

function makeRateLimiter(config, verboseErrors) {
  const store = new Map();

  function getRouteLimit(req) {
    if (req.method === "POST" && req.path === "/items") {
      return config.createMax;
    }

    return config.readMax;
  }

  return function rateLimitMiddleware(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const bucketKey = `${ip}:${req.method}:${req.path}`;
    const now = Date.now();
    const limit = getRouteLimit(req);

    let bucket = store.get(bucketKey);
    if (!bucket || now - bucket.startedAt >= config.windowMs) {
      bucket = {
        startedAt: now,
        count: 0
      };
      store.set(bucketKey, bucket);
    }

    bucket.count += 1;

    if (bucket.count > limit) {
      const payload = verboseErrors
        ? {
            error: "rate_limit_exceeded",
            details: `Limit ${limit} requests per ${config.windowMs}ms`
          }
        : { error: "rate_limit_exceeded" };
      return res.status(429).json(payload);
    }

    return next();
  };
}

module.exports = {
  makeCorsMiddleware,
  makeRequestLogger,
  makeRateLimiter,
  securityHeadersMiddleware
};