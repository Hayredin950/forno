import { Schema, model, type Document } from "mongoose";

export interface IAdmin extends Document {
  name: string;
  email: string;
  password: string;
  role: "admin";
}

const adminSchema = new Schema<IAdmin>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, default: "admin", enum: ["admin"] },
  },
  { timestamps: true },
);

export const Admin = model<IAdmin>("Admin", adminSchema);
