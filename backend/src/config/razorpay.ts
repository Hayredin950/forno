import Razorpay from "razorpay";

let instance: Razorpay | null = null;

export const getRazorpay = (): Razorpay => {
  if (instance) return instance;
  const key_id = process.env["RAZORPAY_KEY_ID"];
  const key_secret = process.env["RAZORPAY_KEY_SECRET"];
  if (!key_id || !key_secret) {
    throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET env vars are required");
  }
  instance = new Razorpay({ key_id, key_secret });
  return instance;
};
