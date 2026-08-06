import { Router } from "express";
import { body } from "express-validator";
import { register, verifyEmail, login, forgotPassword, resetPassword, adminLogin, googleLogin } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post(
  "/register",
  authLimiter,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  ],
  validate,
  register,
);

router.get("/verify-email/:token", verifyEmail);

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  validate,
  login,
);

router.post(
  "/forgot-password",
  authLimiter,
  [body("email").isEmail().normalizeEmail()],
  validate,
  forgotPassword,
);

router.post(
  "/reset-password/:token",
  [body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")],
  validate,
  resetPassword,
);

router.post("/google", googleLogin);

router.post(
  "/admin/login",
  authLimiter,
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  validate,
  adminLogin,
);

export default router;
