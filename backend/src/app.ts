import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";
import { sanitizeMongo } from "./middleware/sanitize";

const app: Express = express();

// Trust the first proxy hop (Render/NGINX) so rate-limiters and logging see
// the real client IP instead of every user sharing the proxy's IP.
app.set("trust proxy", 1);

// Origins are normalized (lowercase, no trailing slash) so values like
// "https://forno-ten.vercel.app/" still match the browser Origin header
// "https://forno-ten.vercel.app".
const normalize = (s: string) => s.trim().toLowerCase().replace(/\/+$/, "");

const allowedOrigins = (process.env["CLIENT_URL"] ?? "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map(normalize)
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(normalize(origin))) return cb(null, true);
      // A disallowed origin should be a 403, not a 500.
      cb(null, false);
    },
    credentials: true,
  }),
);

app.use(helmet());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Serve the pizza/ingredient images directly from the repo on the API host.
// This keeps image URLs like /images/... working even if the frontend is on
// a different origin. Resolves the repo's frontend/public/images directory
// (both in dev from ./src and in prod from ./dist), or IMAGES_DIR if set.
const IMAGES_DIR =
  process.env["IMAGES_DIR"] ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../frontend/public/images");

if (existsSync(IMAGES_DIR)) {
  app.use("/images", express.static(IMAGES_DIR, { maxAge: "7d", immutable: true }));
  logger.info({ dir: IMAGES_DIR }, "Serving /images from repo");
} else {
  logger.warn("Image directory not found; /images will 404 — set IMAGES_DIR to fix");
}

// Strip MongoDB query operators ($gt, $regex, $where …) from all bodies and
// query strings — blocks NoSQL injection before it reaches mongoose filters.
// (Custom middleware: express-mongo-sanitize's default reassigns req.query,
// which is getter-only in Express 5 — see middleware/sanitize.ts.)
app.use(sanitizeMongo);

app.use("/api", router);

// JSON 404 for unknown API routes (keeps the JSON contract).
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(errorHandler);

export default app;
