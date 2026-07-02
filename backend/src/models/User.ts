import { Schema, model, type Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  isVerified: boolean;
  verificationToken: string | null;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
  role: "user";
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    role: { type: String, default: "user", enum: ["user"] },
  },
  { timestamps: true },
);

export const User = model<IUser>("User", userSchema);
