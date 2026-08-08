import { Schema, model, type Document } from "mongoose";

export interface IUpload extends Document {
  mime: string;
  data: Buffer;
  size: number;
  createdAt: Date;
}

/**
 * Stores image bytes directly in MongoDB so uploaded photos survive redeploys
 * (Render's filesystem is ephemeral). Images are capped at a few MB, well
 * under Mongo's 16MB BSON document limit.
 */
const uploadSchema = new Schema<IUpload>(
  {
    mime: { type: String, required: true },
    data: { type: Buffer, required: true },
    size: { type: Number, required: true },
  },
  { timestamps: true },
);

export const Upload = model<IUpload>("Upload", uploadSchema);
