import jwt from "jsonwebtoken";

export const generateUserToken = (userId: string): string => {
  const secret = process.env["JWT_USER_SECRET"];
  if (!secret) throw new Error("JWT_USER_SECRET is not set");
  return jwt.sign({ id: userId, role: "user" }, secret, { expiresIn: "7d" });
};

export const generateAdminToken = (adminId: string): string => {
  const secret = process.env["JWT_ADMIN_SECRET"];
  if (!secret) throw new Error("JWT_ADMIN_SECRET is not set");
  return jwt.sign({ id: adminId, role: "admin" }, secret, { expiresIn: "1d" });
};
