import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/errorHandler";

const app: Express = express();

const allowedOrigins = (process.env["CLIENT_URL"] ?? "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);

app.use(helmet());
app.use(mongoSanitize());

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

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

app.use("/api", router);

app.use(errorHandler);

export default app;
