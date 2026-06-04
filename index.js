// Hostinger Node.js entry file for Tech Mentor ERP & POS (Express app).
const express = require("express");

// Default to production so the API server serves the three web apps.
process.env.NODE_ENV = process.env.NODE_ENV || "production";

// Some Node hosts do not set PORT; provide a safe default.
if (!process.env.PORT) {
  process.env.PORT = "3000";
}

// A minimal Express app so the platform detects this as an Express project.
// The full ERP/API/storefront server is the bundle imported below, which
// takes over and listens on process.env.PORT.
const app = express();
app.get("/__health", (req, res) => {
  res.json({ status: "ok" });
});

// Boot the bundled Express server (it creates its own app and listens).
import("./artifacts/api-server/dist/index.mjs").catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

module.exports = app;
