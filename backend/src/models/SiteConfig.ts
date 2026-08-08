import { Schema, model, type Document } from "mongoose";

export interface IDeliveryOrigin {
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export interface ISocialLinks {
  instagram: string;
  twitter: string;
  facebook: string;
}

export interface IPricing {
  customBasePrice: number;
  taxRate: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
}

export interface ISiteConfig extends Document {
  // Contact / how customers reach the shop
  contactPhone: string;
  supportEmail: string;
  // Social links rendered in the public footer (editable by admin)
  social: ISocialLinks;
  // Where the kitchen is, used for "delivery from" tracking
  deliveryOrigin: IDeliveryOrigin;
  // Business pricing — tax %, delivery fee, custom-pizza base price. The
  // admin controls these so menu money math stays in sync without redeploys.
  pricing: IPricing;
}

const deliveryOriginSchema = new Schema<IDeliveryOrigin>(
  {
    label: { type: String, default: "Forno Kitchen" },
    address: { type: String, default: "" },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  { _id: false },
);

const socialSchema = new Schema<ISocialLinks>(
  {
    instagram: { type: String, default: "" },
    twitter: { type: String, default: "" },
    facebook: { type: String, default: "" },
  },
  { _id: false },
);

const pricingSchema = new Schema<IPricing>(
  {
    customBasePrice: { type: Number, default: 200 },
    taxRate: { type: Number, default: 0.05 },
    deliveryFee: { type: Number, default: 40 },
    freeDeliveryThreshold: { type: Number, default: 500 },
  },
  { _id: false },
);

const siteConfigSchema = new Schema<ISiteConfig>(
  {
    contactPhone: { type: String, default: "" },
    supportEmail: { type: String, default: "" },
    social: { type: socialSchema, default: () => ({}) },
    deliveryOrigin: { type: deliveryOriginSchema, default: () => ({ label: "Forno Kitchen" }) },
    pricing: { type: pricingSchema, default: () => ({ customBasePrice: 200, taxRate: 0.05, deliveryFee: 40, freeDeliveryThreshold: 500 }) },
  },
  { timestamps: true },
);

export const SiteConfig = model<ISiteConfig>("SiteConfig", siteConfigSchema);

/** Ensure a single SiteConfig document exists and return it. */
export const getOrCreateSiteConfig = async (): Promise<ISiteConfig> => {
  const existing = await SiteConfig.findOne();
  if (existing) return existing;
  return SiteConfig.create({});
};
