import app from "./app.js";
import { logger } from "./lib/logger.js";
import { seed } from "./seed.js";

// Hostinger loads this module and uses the exported Express `app` directly,
// so we must NOT call app.listen() here. We only trigger seeding on boot.
seed().catch((err) => logger.error({ err }, "Seed failed"));

export default app;
