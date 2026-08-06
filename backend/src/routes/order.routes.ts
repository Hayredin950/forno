import { Router } from "express";
import { body } from "express-validator";
import { createOrder, initiatePayment, verifyPayment, myOrders, orderStatus, getOrderById } from "../controllers/order.controller";
import { authUser } from "../middleware/authUser";
import { validate } from "../middleware/validate";
import { apiLimiter } from "../middleware/rateLimiter";

const router = Router();

router.use(apiLimiter);

router.post(
  "/",
  authUser,
  [
    body("items").isArray({ min: 1, max: 20 }).withMessage("items must be an array of 1-20 items"),
    body("items.*.type").isIn(["preset", "custom"]).withMessage("item type must be preset or custom"),
    body("items.*.quantity").isInt({ min: 1, max: 99 }).withMessage("quantity must be 1-99"),
    body("items.*.pizzaRef").optional({ values: "falsy" }).isMongoId().withMessage("invalid pizzaRef"),
    body("items.*.customBuild.base").optional({ values: "falsy" }).isMongoId(),
    body("items.*.customBuild.sauce").optional({ values: "falsy" }).isMongoId(),
    body("items.*.customBuild.cheese").optional({ values: "falsy" }).isMongoId(),
    body("items.*.customBuild.vegetables").optional().isArray({ max: 20 }),
    body("items.*.customBuild.vegetables.*").optional({ values: "falsy" }).isMongoId(),
    body("deliveryAddress.street").optional().trim().isLength({ max: 200 }),
    body("deliveryAddress.city").optional().trim().isLength({ max: 100 }),
    body("deliveryAddress.state").optional().trim().isLength({ max: 100 }),
    body("deliveryAddress.pincode").optional().trim().isLength({ max: 10 }),
  ],
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

// Scoped to the requesting user — status of other users' orders is not public.
router.get("/:id/status", authUser, orderStatus);

// Full order detail, scoped to the requesting user — must stay after the
// more specific "/my-orders" and "/:id/status" routes above, or ":id"
// would greedily swallow those paths.
router.get("/:id", authUser, getOrderById);

export default router;
