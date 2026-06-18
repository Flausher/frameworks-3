const express = require("express");
const {
  makeCorsMiddleware,
  makeRequestLogger,
  makeRateLimiter,
  securityHeadersMiddleware
} = require("./middleware/security");

function createApp(config) {
  const app = express();
  const items = [];
  const verboseErrors = config.mode === "learning";

  app.use(express.json());
  app.use(makeRequestLogger(verboseErrors));
  app.use(securityHeadersMiddleware);
  app.use(makeCorsMiddleware(config.trustedOrigins, verboseErrors));
  app.use(makeRateLimiter(config.rateLimit, verboseErrors));

  app.get("/health", (req, res) => {
    res.json({
      ok: true,
      mode: config.mode
    });
  });

  app.get("/items", (req, res) => {
    res.json({
      items
    });
  });

  app.post("/items", (req, res) => {
    const name = req.body && req.body.name;
    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        error: "name_required"
      });
    }

    const item = {
      id: items.length + 1,
      name: name.trim()
    };
    items.push(item);

    return res.status(201).json(item);
  });

  return app;
}

module.exports = {
  createApp
};