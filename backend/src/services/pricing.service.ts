import { getOrCreateSiteConfig } from "../models/SiteConfig";
import { roundMoney } from "../utils/pricing";

export interface LivePricing {
  customBasePrice: number;
  taxRate: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
}

/**
 * Load the shop's pricing from SiteConfig (editable by the admin) and fall
 * back to the built-in defaults whenever the config is missing/invalid —
 * so an unconfigured install still behaves exactly like before.
 */
export async function getPricingConfig(): Promise<LivePricing> {
  const cfg = await getOrCreateSiteConfig();
  const p = cfg.pricing ?? ({} as LivePricing);
  const num = (v: unknown): number => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    customBasePrice: num(p.customBasePrice) > 0 ? num(p.customBasePrice) : 200,
    taxRate: num(p.taxRate) > 0 ? num(p.taxRate) : 0.05,
    deliveryFee: num(p.deliveryFee) >= 0 ? num(p.deliveryFee) : 40,
    freeDeliveryThreshold: num(p.freeDeliveryThreshold) > 0 ? num(p.freeDeliveryThreshold) : 500,
  };
}

export const calcTax = (subtotal: number, rate: number): number => roundMoney(subtotal * rate);

export const calcDeliveryFee = (subtotal: number, fee: number, threshold: number): number =>
  subtotal >= threshold ? 0 : fee;
