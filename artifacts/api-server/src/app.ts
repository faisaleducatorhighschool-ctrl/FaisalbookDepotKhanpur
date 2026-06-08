import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true, limit: "12mb" }));

app.use("/api", router);

// Any unmatched /api request returns JSON 404 so the SPA fallback below never
// serves HTML for a missing API route.
app.use("/api", (_req, res: express.Response) => {
  res.status(404).json({ error: "Not Found" });
});

if (process.env.NODE_ENV === "production") {
  // Resolve static dirs relative to this bundle (artifacts/api-server/dist),
  // not process.cwd(), so serving works regardless of the launch directory.
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.join(here, "..", "..", "..");

  // Storefront — served at /store
  const storeDist = path.join(root, "artifacts/store/dist/public");
  app.use("/store", express.static(storeDist));
  app.use("/store", (_req, res: express.Response) => {
    res.sendFile(path.join(storeDist, "index.html"));
  });

  // Customer web app — served at /customer-app
  const customerDist = path.join(root, "artifacts/customer-app/dist/public");
  app.use("/customer-app", express.static(customerDist));
  app.use("/customer-app", (_req, res: express.Response) => {
    res.sendFile(path.join(customerDist, "index.html"));
  });

  // ERP admin — served at the root (must be registered last)
  const erpDist = path.join(root, "artifacts/smart-retail-erp/dist/public");
  app.use(express.static(erpDist));
  app.use((_req, res: express.Response) => {
    res.sendFile(path.join(erpDist, "index.html"));
  });
}

export default app;
