// Hostinger Node.js entry for Tech Mentor ERP & POS (Express app).
//
// Hostinger runs Node apps under LiteSpeed's lsnode, which reads
// `module.exports` and feeds requests to it. It does NOT reliably keep
// background async work alive between requests, so a "load in the background
// and reply 503 meanwhile" approach never finishes loading.
//
// Instead we export a small Express app immediately whose first middleware
// AWAITS the (memoized) load of the real server, then forwards the request.
// The first request to a fresh worker pays the load cost (a few seconds);
// every later request in that worker is instant. We also call listen() so the
// app still works if Hostinger runs it as a standalone process.
const express = require("express");

// --- LiteSpeed (lsnode) compatibility -------------------------------------
// Hostinger runs Node under LiteSpeed's lsnode, which occupies file
// descriptor 0. Node's lazy `process.stdin` getter tries to wrap fd 0 in a
// Socket and throws `Error: open EEXIST`, which crashes ESM module loading
// while Node builds the `process` facade. The server never reads stdin, so we
// pre-define a harmless empty readable stream before anything touches it.
try {
  const { Readable } = require("stream");
  Object.defineProperty(process, "stdin", {
    value: Readable.from([]),
    configurable: true,
    enumerable: true,
    writable: false,
  });
} catch (e) {
  console.error("Could not patch process.stdin:", e && e.message);
}
// --------------------------------------------------------------------------

// --- Node 18 compatibility ------------------------------------------------
// The bundled server pulls in storage libraries that reference the global
// `File` class. `File` only became a Node global in v20, so on Hostinger's
// Node 18 the bundle throws `ReferenceError: File is not defined` while
// loading. The storage feature is unused on Hostinger, so a working/stub
// `File` is enough to let the module load.
if (typeof globalThis.File === "undefined") {
  try {
    globalThis.File = require("node:buffer").File;
  } catch (e) {}
  if (typeof globalThis.File === "undefined") {
    try {
      globalThis.File = require("undici").File;
    } catch (e) {}
  }
  if (typeof globalThis.File === "undefined") {
    globalThis.File = class File {};
  }
}
// --------------------------------------------------------------------------

// Default to production so the bundled server serves the three web apps.
process.env.NODE_ENV = process.env.NODE_ENV || "production";

// Some Node hosts do not set PORT; provide a safe default.
if (!process.env.PORT) {
  process.env.PORT = "3000";
}

const proxy = express();

let realApp = null;
let loadPromise = null;
let bootError = null;

// If the database settings are missing, the bundled server throws on import.
// Detect that up front so the browser shows a clear, actionable message.
if (!process.env.DATABASE_URL) {
  bootError = new Error(
    "DATABASE_URL is not set. Add it (and SESSION_SECRET) under " +
      "Environment variables in the Hostinger dashboard, then redeploy.",
  );
  console.error(bootError.message);
}

// Memoized loader for the bundled server (it exports the Express app; it does
// NOT listen). Returns a promise that resolves once `realApp` is ready.
function ensureLoaded() {
  if (realApp) return Promise.resolve();
  if (bootError) return Promise.reject(bootError);
  if (!loadPromise) {
    loadPromise = import("./artifacts/api-server/dist/hostinger.mjs")
      .then((mod) => {
        realApp = mod.default || mod;
        console.log("ERP server loaded and ready.");
      })
      .catch((err) => {
        bootError = err;
        console.error("Failed to load ERP server:", err);
        throw err;
      });
  }
  return loadPromise;
}

// Friendly diagnostic page shown only when loading actually fails.
function diagnostics() {
  const hasDbUrl = Boolean(process.env.DATABASE_URL);
  const hasSecret = Boolean(process.env.SESSION_SECRET);
  const detail =
    "ERROR while loading the app:\n" +
    (bootError && bootError.stack ? bootError.stack : String(bootError));
  return (
    "Tech Mentor ERP — startup status\n" +
    "================================\n\n" +
    "DATABASE_URL set:   " + (hasDbUrl ? "yes" : "NO  <-- add this in Environment variables") + "\n" +
    "SESSION_SECRET set: " + (hasSecret ? "yes" : "NO  <-- add this in Environment variables") + "\n\n" +
    detail +
    "\n"
  );
}

// Hold each request until the real app is loaded, then forward it.
proxy.use(async (req, res, next) => {
  try {
    await ensureLoaded();
  } catch (err) {
    res.status(500).type("text/plain").send(diagnostics());
    return;
  }
  realApp(req, res, next);
});

// Start loading immediately so persistent workers are warm before the first
// request arrives (harmless if the worker is short-lived).
if (!bootError) {
  ensureLoaded().catch(() => {});
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
