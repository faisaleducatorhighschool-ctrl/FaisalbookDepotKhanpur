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
let timedOut = false;

const startedAt = Date.now();

// Friendly diagnostic page so a non-technical operator can see what is wrong
// in the browser instead of an opaque "starting" message that never changes.
function diagnostics() {
  const secs = Math.round((Date.now() - startedAt) / 1000);
  const hasDbUrl = Boolean(process.env.DATABASE_URL);
  const hasSecret = Boolean(process.env.SESSION_SECRET);
  let detail = "";
  if (bootError) {
    detail =
      "ERROR while loading the app:\n" +
      (bootError && bootError.stack ? bootError.stack : String(bootError));
  } else if (timedOut) {
    detail =
      "The app has not finished loading after " +
      secs +
      " seconds, which usually means a required setting is missing or the database is unreachable.";
  } else {
    detail = "Still loading (" + secs + "s).";
  }
  return (
    "Tech Mentor ERP — startup status\n" +
    "================================\n\n" +
    "DATABASE_URL set:   " + (hasDbUrl ? "yes" : "NO  <-- add this in Environment variables") + "\n" +
    "SESSION_SECRET set: " + (hasSecret ? "yes" : "NO  <-- add this in Environment variables") + "\n\n" +
    detail +
    "\n"
  );
}

// Forward every request to the real server once it is ready.
proxy.use((req, res, next) => {
  if (realApp) {
    realApp(req, res, next);
    return;
  }
  const status = bootError ? 500 : 503;
  res.status(status).type("text/plain").send(diagnostics());
});

// If the database settings are missing, the bundled server throws on import.
// Detect that up front so the browser shows a clear, actionable message.
if (!process.env.DATABASE_URL) {
  bootError = new Error(
    "DATABASE_URL is not set. Add it (and SESSION_SECRET) under " +
      "Environment variables in the Hostinger dashboard, then redeploy.",
  );
  console.error(bootError.message);
} else {
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

  // Watchdog: if loading stalls, surface that in the browser instead of
  // showing "starting" forever.
  setTimeout(() => {
    if (!realApp && !bootError) {
      timedOut = true;
      console.error("ERP server still not ready after 45s.");
    }
  }, 45000);
}

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
