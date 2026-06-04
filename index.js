// Hostinger Node.js entry for Tech Mentor ERP & POS (Express app).
//
// Hostinger loads this file and reads `module.exports` SYNCHRONOUSLY to serve
// the app. The real ERP/API/storefront server is a large ES module that can
// only be loaded asynchronously (via dynamic import). To bridge that gap, we
// export a small Express app immediately and forward every request to the real
// server once it has finished loading. We also call listen() so the app still
// works if Hostinger runs it as a standalone process.
const express = require("express");

// Default to production so the bundled server serves the three web apps.
process.env.NODE_ENV = process.env.NODE_ENV || "production";

// Some Node hosts do not set PORT; provide a safe default.
if (!process.env.PORT) {
  process.env.PORT = "3000";
}

const proxy = express();

let realApp = null;
let bootError = null;

// Forward every request to the real server once it is ready.
proxy.use((req, res, next) => {
  if (realApp) {
    realApp(req, res, next);
    return;
  }
  if (bootError) {
    res.status(500).send("Server failed to start. Please check the logs.");
    return;
  }
  res.status(503).send("Server is starting, please refresh in a few seconds.");
});

// Load the bundled server (it exports the Express app; it does NOT listen).
import("./artifacts/api-server/dist/hostinger.mjs")
  .then((mod) => {
    realApp = mod.default || mod;
    console.log("ERP server loaded and ready.");
  })
  .catch((err) => {
    bootError = err;
    console.error("Failed to load ERP server:", err);
  });

// Listen for the standalone run model. Under hosts that bind the exported app
// themselves, this may hit EADDRINUSE, which we safely ignore.
const port = Number(process.env.PORT);
const server = proxy.listen(port, () => {
  console.log("Listening on port " + port);
});
server.on("error", (err) => {
  console.error("listen() notice (safe to ignore):", err.message);
});

module.exports = proxy;
