import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import "dotenv/config";

// Import all controllers
import { authController } from "./controllers/auth";
import { publicController } from "./controllers/public";
import { adminController } from "./controllers/admin";
import { jobsController } from "./controllers/jobs";
import { portfolioController } from "./controllers/portfolio";
import { cs2Controller } from "./controllers/cs2";
import { studioController } from "./controllers/studio";
import { publishController } from "./controllers/publish";
import { filesController } from "./controllers/files";
import { syncController } from "./controllers/sync";
import { linksController } from "./controllers/links";
import { animeController } from "./controllers/anime";
import { englishController } from "./controllers/english";
import { menuController } from "./controllers/menu";
import { t2Controller } from "./controllers/t2";

/**
 * Main server entry point.
 *
 * - Loads environment variables via `dotenv/config`.
 * - Sets up Elysia with CORS and Swagger UI (available at `/swagger`).
 * - Mounts all available controllers for the application.
 * - Starts listening on the port defined by `PORT` (defaults to 8000).
 */
const PORT = Number(process.env.PORT) || 8000;

const app = new Elysia()
  .use(cors())
  .use(
    swagger({
      detail: {
        info: {
          title: "BGalin API Documentation",
          version: "2.0.0",
          description: "Complete REST API for BGalin portfolio platform with Telegram auth, HH.ru integration, and more",
        },
        servers: [
          { url: "http://localhost:8000", description: "Development" },
          { url: "https://bgalin.ru", description: "Production" },
        ],
      },
    }),
  )
  // Public routes (health, server info, etc.)
  .use(publicController)
  // Auth routes (Telegram OTP authentication)
  .use(authController)
  // Admin routes (dashboard, statistics)
  .use(adminController)
  // Job search routes (HH.ru integration)
  .use(jobsController)
  // Portfolio management routes
  .use(portfolioController)
  // CS2 GSI routes
  .use(cs2Controller)
  // Studio routes (Steam auth + project management)
  .use(studioController)
  // Publish routes (video-to-GIF conversion)
  .use(publishController)
  // Files routes (hierarchical storage)
  .use(filesController)
  // Sync routes (client-server file sync)
  .use(syncController)
  // Links routes (short URLs)
  .use(linksController)
  // Anime routes (tracking + Sheets integration)
  .use(animeController)
  // English learning routes (SRS system)
  .use(englishController)
  // Menu routes (sidebar visibility)
  .use(menuController)
  // T2 Sales System routes
  .use(t2Controller)
  // Fallback root message
  .get("/", () => ({
    success: true,
    message: "BGalin API v2.0 - Running on Bun/Elysia",
    docs: "/swagger",
  }))
  .listen(PORT);

console.log(
  `✨ Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
