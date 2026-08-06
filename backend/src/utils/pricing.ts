// Single source of truth for money math shared by the frontend cart and the
// server-side order calculation. All values are rupees; we round to 2 dp only
// at the very end to avoid float drift.

export const CUSTOM_BASE_PRICE = 200;
export const TAX_RATE = 0.05;
export const DELIVERY_FEE = 40;
export const FREE_DELIVERY_THRESHOLD = 500;

/** ₹1234.5 -> 1234.5 (round to 2 dp, avoiding binary float noise). */
export const roundMoney = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export const calcTax = (subtotal: number): number => roundMoney(subtotal * TAX_RATE);

export const calcDeliveryFee = (subtotal: number): number =>
  subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;

export const calcTotal = (subtotal: number): number => {
  const tax = calcTax(subtotal);
  const deliveryFee = calcDeliveryFee(subtotal);
  return roundMoney(subtotal + tax + deliveryFee);
};