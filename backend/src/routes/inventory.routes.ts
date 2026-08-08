import { Router } from "express";
import { body } from "express-validator";
import { listInventory, updateStock, updateThreshold, adjustStock, createIngredient, updateIngredientDetails, deleteIngredient } from "../controllers/inventory.controller";
import { authAdmin } from "../middleware/authAdmin";
import { validate } from "../middleware/validate";

const router = Router();

// Public access for listing inventory
router.get("/", listInventory);

// Admin only routes
router.use(authAdmin);

router.post(
  "/",
  [
    body("type").isIn(["base", "sauce", "cheese", "vegetable"]).withMessage("type must be base, sauce, cheese, or vegetable"),
    body("name").trim().notEmpty().withMessage("name is required"),
    body("unit").trim().notEmpty().withMessage("unit is required"),
  ],
  validate,
  createIngredient,
);

router.delete("/:id", deleteIngredient);

// Edit an ingredient's details (name/unit/price/image) without touching stock.
router.patch(
  "/:id/details",
  [
    body("name").optional().trim().notEmpty().withMessage("name cannot be empty"),
    body("unit").optional().trim().notEmpty().withMessage("unit cannot be empty"),
    body("price").optional().isNumeric().withMessage("price must be a number"),
    body("image").optional().isString().withMessage("image must be a string"),
  ],
  validate,
  updateIngredientDetails,
);

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
