import { Router } from "express";
import { body } from "express-validator";
import { createOrder, initiatePayment, verifyPayment, myOrders, orderStatus } from "../controllers/order.controller";
import { authUser } from "../middleware/authUser";
import { validate } from "../middleware/validate";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

router.use(apiLimiter);

router.post(
  "/",
  authUser,
  [body("items").isArray({ min: 1 }).withMessage("items must be a non-empty array")],
  validate,
  createOrder,
);

router.post("/:id/payment", authUser, initiatePayment);

router.post(
  "/:id/verify-payment",
  authUser,
  [
    body("razorpayOrderId").notEmpty(),
    body("razorpayPaymentId").notEmpty(),
    body("razorpaySignature").notEmpty(),
  ],
  validate,
  verifyPayment,
);

router.get("/my-orders", authUser, myOrders);

router.get("/:id/status", orderStatus);

export default router;
