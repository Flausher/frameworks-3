const { loadConfig } = require("./config/loadConfig");
const { validateConfig } = require("./config/validateConfig");
const { createApp } = require("./app");

function printStartupErrors(mode, errors) {
  if (mode === "learning") {
    console.error("Configuration errors:");
    for (const err of errors) {
      console.error(`- ${err}`);
    }
  } else {
    console.error("Invalid configuration");
  }
}

function startServer() {
  const { config } = loadConfig();
  const result = validateConfig(config);

  if (!result.ok) {
    printStartupErrors(config.mode, result.errors);
    process.exitCode = 1;
    return;
  }

  const app = createApp(config);
  app.listen(config.port, () => {
    if (config.mode === "learning") {
      console.log(`Service started on port ${config.port} in ${config.mode} mode`);
    } else {
      console.log("Service started");
    }
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  startServer,
  printStartupErrors
};