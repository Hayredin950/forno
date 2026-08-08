import { Schema, model, type Document } from "mongoose";

export interface ISavedAddress {
  label: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  lat?: number;
  lng?: number;
  isDefault: boolean;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  addresses: ISavedAddress[];
  isVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpires: Date | null;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
  role: "user";
  googleId: string | null;
  isActive: boolean;
  createdAt: Date;
}

const savedAddressSchema = new Schema<ISavedAddress>(
  {
    label: { type: String, default: "Home" },
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    pincode: { type: String, default: "" },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, default: "", trim: true },
    addresses: { type: [savedAddressSchema], default: [] },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    verificationTokenExpires: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
    role: { type: String, default: "user", enum: ["user"] },
    googleId: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const User = model<IUser>("User", userSchema);
