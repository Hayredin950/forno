import { Router } from "express";
import { body } from "express-validator";
import { listInventory, updateStock, updateThreshold, adjustStock } from "../controllers/inventory.controller";
import { authAdmin } from "../middleware/authAdmin";
import { validate } from "../middleware/validate";

const router = Router();

// Public access for listing inventory
router.get("/", listInventory);

// Admin only routes
router.use(authAdmin);

router.patch(
  "/:id",
  [
    body("action").isIn(["set", "increment", "decrement"]).withMessage("action must be set, increment, or decrement"),
    body("amount").isNumeric().withMessage("amount must be a number"),
  ],
  validate,
  updateStock,
);

router.patch(
  "/:id/threshold",
  [body("lowStockThreshold").isNumeric().withMessage("lowStockThreshold must be a number")],
  validate,
  updateThreshold,
);

router.patch(
  "/:id/adjust",
  [body("amount").isNumeric().withMessage("amount must be a number")],
  validate,
  adjustStock,
);

export default router;
