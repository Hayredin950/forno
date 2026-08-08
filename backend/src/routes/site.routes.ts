import { Router } from "express";
import { body } from "express-validator";
import {
  getPublicSiteConfig,
  getStats,
  subscribeNewsletter,
} from "../controllers/siteConfig.controller";
import { getUpload } from "../controllers/upload.controller";
import { validate } from "../middleware/validate";

const router = Router();

router.get("/config", getPublicSiteConfig);
router.get("/stats", getStats);

// Stored images (MongoDB-backed uploads) are public — they render on menu,
// cart, order and admin pages without authentication.
router.get("/uploads/:id", getUpload);
router.post(
  "/newsletter",
  [body("email").isEmail().withMessage("A valid email address is required")],
  validate,
  subscribeNewsletter,
);

export default router;
