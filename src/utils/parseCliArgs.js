function parseCliArgs(argv) {
  const out = {};

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }

    const body = token.slice(2);
    if (!body) {
      continue;
    }

    const eqIndex = body.indexOf("=");
    if (eqIndex >= 0) {
      const key = body.slice(0, eqIndex);
      const value = body.slice(eqIndex + 1);
      out[key] = value;
      continue;
    }

    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[body] = next;
      i += 1;
    } else {
      out[body] = "true";
    }
  }

  return out;
}

module.exports = {
  parseCliArgs
};