import crypto from "node:crypto";
import { getRazorpay } from "../config/razorpay";
import { ApiError } from "../utils/apiError";

const isPlaceholder = (v: string | undefined): boolean =>
  !v || v.trim() === "" || /x{4,}/i.test(v);

// Local dev/CI often ships without real Razorpay credentials (see .env.example
// placeholders). Rather than 500ing every checkout, fall back to a simulated
// payment flow when the keys are missing/placeholder — mirrors the "Test mode"
// notice already shown in the checkout UI.
export const isRazorpayConfigured = (): boolean =>
  !isPlaceholder(process.env["RAZORPAY_KEY_ID"]) && !isPlaceholder(process.env["RAZORPAY_KEY_SECRET"]);

export const createRazorpayOrder = async (
  amountInPaise: number,
  receiptId: string,
): Promise<{ id: string; amount: number; currency: string }> => {
  const rzp = getRazorpay();
  const order = await rzp.orders.create({
    amount: amountInPaise,
    currency: "INR",
    receipt: receiptId,
  });
  return { id: order.id, amount: order.amount as number, currency: order.currency };
};

const MOCK_ORDER_PREFIX = "order_mock_";

export const createMockRazorpayOrder = (amountInPaise: number): { id: string; amount: number; currency: string } => ({
  id: `${MOCK_ORDER_PREFIX}${crypto.randomBytes(10).toString("hex")}`,
  amount: amountInPaise,
  currency: "INR",
});

export const isMockRazorpayOrderId = (id: string | null | undefined): boolean =>
  !!id && id.startsWith(MOCK_ORDER_PREFIX);

export const verifyRazorpaySignature = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): boolean => {
  const secret = process.env["RAZORPAY_KEY_SECRET"];
  if (!secret) throw new ApiError(500, "Razorpay key secret not configured");

  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  return expected === razorpaySignature;
};
