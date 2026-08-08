import { Router } from "express";
import { body } from "express-validator";
import { register, verifyEmail, login, forgotPassword, resetPassword, adminLogin, googleLogin, getProfile, updateProfile } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authLimiter } from "../middleware/rateLimiter";
import { authUser } from "../middleware/authUser";

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

router.post(
  "/google",
  authLimiter,
  [body("idToken").notEmpty().withMessage("idToken is required")],
  validate,
  googleLogin,
);

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

// Profile — phone number + saved delivery addresses (shown to the courier).
router.get("/me", authUser, getProfile);
router.patch(
  "/me",
  authUser,
  [
    body("name").optional().trim().isLength({ max: 80 }),
    body("phone").optional().trim().isLength({ max: 20 }),
    body("addresses").optional().isArray({ max: 20 }),
  ],
  validate,
  updateProfile,
);

export default router;
