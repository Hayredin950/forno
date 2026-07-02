import { Router } from "express";
import { body } from "express-validator";
import { getAllOrders, updateOrderStatus } from "../controllers/admin.controller";
import { authAdmin } from "../middleware/authAdmin";
import { validate } from "../middleware/validate";

const router = Router();

router.use(authAdmin);

router.get("/orders", getAllOrders);
router.patch(
  "/orders/:id/status",
  [body("orderStatus").notEmpty().withMessage("orderStatus is required")],
  validate,
  updateOrderStatus,
);

export default router;
