import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { User, type ISavedAddress } from "../models/User";
import type { AuthUserRequest } from "../middleware/authUser";
import { Admin } from "../models/Admin";
import { generateUserToken, generateAdminToken } from "../utils/generateToken";
import { logger } from "../lib/logger";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/email.service";
import { sendSuccess } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

export const register = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { name, email, password } = req.body as { name: string; email: string; password: string };

  const existing = await User.findOne({ email });
  if (existing) return next(new ApiError(409, "Email already registered"));

  const hashed = await bcrypt.hash(password, 12);
  const verificationToken = crypto.randomBytes(32).toString("hex");

  const skipVerification = process.env["NODE_ENV"] === "development" || process.env["SKIP_EMAIL_VERIFICATION"] === "true";

  const user = await User.create({
    name,
    email,
    password: hashed,
    verificationToken: skipVerification ? null : verificationToken,
    verificationTokenExpires: skipVerification ? null : new Date(Date.now() + 24 * 60 * 60 * 1000),
    isVerified: skipVerification,
  });

  if (!skipVerification) {
    await sendVerificationEmail(email, verificationToken);
    sendSuccess(res, { id: user._id, email: user.email }, "Registration successful. Check your email to verify your account.", 201);
  } else {
    const token = generateUserToken(String(user._id));
    sendSuccess(res, { token, user: { id: user._id, name: user.name, email: user.email } }, "Registration successful.", 201);
  }
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.params as { token: string };

  const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: new Date() },
  });
  if (!user) return next(new ApiError(400, "Invalid or expired verification token"));

  user.isVerified = true;
  user.verificationToken = null;
  user.verificationTokenExpires = null;
  await user.save();

  sendSuccess(res, null, "Email verified successfully. You can now log in.");
});

export const login = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await User.findOne({ email }).select("+password");
  if (!user) return next(new ApiError(401, "Invalid email or password"));

  const match = await bcrypt.compare(password, user.password);
  if (!match) return next(new ApiError(401, "Invalid email or password"));

  if (!user.isVerified) return next(new ApiError(403, "Please verify your email before logging in"));
  if (user.isActive === false) return next(new ApiError(403, "Your account has been deactivated. Contact support."));

  const token = generateUserToken(String(user._id));
  sendSuccess(res, { token, user: { id: user._id, name: user.name, email: user.email } }, "Login successful");
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email: string };

  const user = await User.findOne({ email });
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    await sendPasswordResetEmail(email, token);
  }

  sendSuccess(res, null, "If that email is registered, a reset link has been sent.");
});

export const resetPassword = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.params as { token: string };
  const { password } = req.body as { password: string };

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) return next(new ApiError(400, "Invalid or expired reset token"));

  user.password = await bcrypt.hash(password, 12);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  sendSuccess(res, null, "Password reset successfully. You can now log in.");
});

export const googleLogin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { idToken } = req.body as { idToken: string };
  if (!idToken) return next(new ApiError(400, "idToken is required"));

  const clientId = process.env["GOOGLE_CLIENT_ID"];
  if (!clientId) return next(new ApiError(503, "Google sign-in is not configured on this server"));

  try {
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.email) return next(new ApiError(401, "Invalid Google token"));
    if (payload.email_verified !== true) {
      return next(new ApiError(401, "Google email is not verified"));
    }

    const email = payload.email.toLowerCase();
    let user = await User.findOne({ email });

    if (!user) {
      // Auto-create an account for first-time Google sign-ins
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        password: crypto.randomBytes(32).toString("hex"), // random, unusable password
        isVerified: true,
        verificationToken: null,
        googleId: payload.sub ?? null,
      });
    } else if (user.googleId && user.googleId !== payload.sub) {
      return next(new ApiError(409, "This email is already linked to another account"));
    } else {
      // Update googleId if this is the first Google sign-in for an existing user
      if (!user.googleId) {
        user.googleId = payload.sub ?? null;
        user.isVerified = true;
        await user.save();
      }
    }

    const token = generateUserToken(String(user._id));
    sendSuccess(res, { token, user: { id: user._id, name: user.name, email: user.email } }, "Google login successful");
  } catch (err) {
    logger.error({ err }, "Google token verification failed");
    return next(new ApiError(401, "Invalid Google token"));
  }
});

export const adminLogin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body as { email: string; password: string };

  const admin = await Admin.findOne({ email }).select("+password");
  if (!admin) return next(new ApiError(401, "Invalid credentials"));

  const match = await bcrypt.compare(password, admin.password);
  if (!match) return next(new ApiError(401, "Invalid credentials"));

  const token = generateAdminToken(String(admin._id));
  sendSuccess(res, { token, admin: { id: admin._id, name: admin.name, email: admin.email } }, "Admin login successful");
});

// ─── Profile (phone + saved delivery addresses, editable by the user) ─────

const sanitizeUser = (user: InstanceType<typeof User>) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  phone: user.phone ?? "",
  addresses: (user.addresses ?? []).map((a) => ({
    _id: String(a._id ?? ""),
    label: a.label ?? "",
    street: a.street ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    pincode: a.pincode ?? "",
    lat: a.lat ?? undefined,
    lng: a.lng ?? undefined,
    isDefault: a.isDefault ?? false,
  })),
});

/** Current user's profile — what the profile page and checkout prefill from. */
export const getProfile = asyncHandler(async (req: AuthUserRequest, res: Response, next: NextFunction) => {
  const user = await User.findById(req.userId);
  if (!user) return next(new ApiError(404, "User not found"));
  sendSuccess(res, { user: sanitizeUser(user) });
});

/** Update name / phone / saved addresses. Full replace of the addresses array. */
export const updateProfile = asyncHandler(async (req: AuthUserRequest, res: Response, next: NextFunction) => {
  const user = await User.findById(req.userId);
  if (!user) return next(new ApiError(404, "User not found"));

  const { name, phone, addresses } = req.body as {
    name?: string;
    phone?: string;
    addresses?: ISavedAddress[];
  };

  if (name !== undefined && String(name).trim()) user.name = String(name).trim();
  if (phone !== undefined) user.phone = String(phone).trim();

  if (Array.isArray(addresses)) {
    const clean: ISavedAddress[] = addresses.map((a) => ({
      label: String(a.label ?? "Home").trim() || "Home",
      street: String(a.street ?? "").trim(),
      city: String(a.city ?? "").trim(),
      state: String(a.state ?? "").trim(),
      pincode: String(a.pincode ?? "").trim(),
      lat: typeof a.lat === "number" ? a.lat : undefined,
      lng: typeof a.lng === "number" ? a.lng : undefined,
      isDefault: !!a.isDefault,
    }));
    // Keep at most one default address.
    const hasDefault = clean.some((a) => a.isDefault);
    if (!hasDefault && clean.length > 0) clean[0].isDefault = true;
    user.addresses = clean;
  }

  await user.save();
  sendSuccess(res, { user: sanitizeUser(user) }, "Profile updated");
});
