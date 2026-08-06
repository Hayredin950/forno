import type { Request, RequestHandler } from "express";
import mongoSanitize from "express-mongo-sanitize";

const sanitize = mongoSanitize.sanitize;

const SANITIZABLE: (keyof Request & "body" | "params" | "headers")[] = ["body", "params", "headers"];

/**
 * NoSQL-injection guard that works with Express 5.
 *
 * The stock express-mongo-sanitize middleware reassigns `req.query`, which is
 * a getter-only property in Express 5 and throws "Cannot set property query".
 * Instead we:
 *   - sanitize body/params/headers in place (writable properties), and
 *   - wrap the query getter so every read returns a sanitized copy.
 */
export function sanitizeMongo(req: Request, _res: unknown, next: () => void): void {
  try {
    for (const key of SANITIZABLE) {
      const target = req[key] as Record<string, unknown> | undefined;
      if (target && typeof target === "object") {
        req[key] = sanitize(target) as never;
      }
    }

    const proto = Object.getPrototypeOf(req);
    const originalDescriptor = Object.getOwnPropertyDescriptor(proto, "query");
    if (originalDescriptor?.get) {
      const { get } = originalDescriptor;
      Object.defineProperty(req, "query", {
        configurable: true,
        enumerable: true,
        get() {
          return sanitize(get.call(this) ?? Object.create(null)) as Request["query"];
        },
      });
    }
  } catch (err) {
    next(err as Error);
    return;
  }
  next();
}