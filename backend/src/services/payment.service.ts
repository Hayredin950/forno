import crypto from "node:crypto";
import { getRazorpay } from "../config/razorpay";
import { ApiError } from "../utils/apiError";

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
