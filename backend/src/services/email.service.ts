import { getMailer } from "../config/mailer";
import { logger } from "../lib/logger";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async (opts: SendEmailOptions): Promise<void> => {
  // If SMTP isn't configured (e.g. demo/production without credentials),
  // log the email instead of crashing the request flow.
  if (!process.env["SMTP_HOST"] || !process.env["SMTP_USER"] || !process.env["SMTP_PASS"]) {
    logger.info({ to: opts.to, subject: opts.subject }, "SMTP not configured - email skipped (logged only)");
    return;
  }

  const mailer = await getMailer();
  const from = process.env["SMTP_FROM"] ?? "Forno <noreply@forno.local>";

  const info = await mailer.sendMail({ from, ...opts });

  if (process.env["NODE_ENV"] !== "production") {
    try {
      const nodemailer = await import("nodemailer");
      logger.info({ url: nodemailer.getTestMessageUrl(info) }, "Preview email at");
    } catch {
      // ignore
    }
  }
};

export const sendVerificationEmail = async (to: string, token: string): Promise<void> => {
  const clientUrl = process.env["CLIENT_URL"] ?? "http://localhost:3000";
  const link = `${clientUrl}/verify-email/${token}`;
  await sendEmail({
    to,
    subject: "Verify your Forno account",
    html: `<h2>Welcome to Forno!</h2><p>Click the link below to verify your email address:</p><a href="${link}">${link}</a><p>This link expires in 24 hours.</p>`,
  });
};

export const sendPasswordResetEmail = async (to: string, token: string): Promise<void> => {
  const clientUrl = process.env["CLIENT_URL"] ?? "http://localhost:3000";
  const link = `${clientUrl}/reset-password/${token}`;
  await sendEmail({
    to,
    subject: "Reset your Forno password",
    html: `<h2>Password Reset</h2><p>Click the link below to reset your password. This link expires in 1 hour.</p><a href="${link}">${link}</a><p>If you didn't request this, ignore this email.</p>`,
  });
};

export const sendLowStockAlertEmail = async (
  adminEmail: string,
  items: Array<{ name: string; currentStock: number; unit: string; lowStockThreshold: number }>,
): Promise<void> => {
  const rows = items
    .map(
      (i) =>
        `<tr><td>${i.name}</td><td>${i.currentStock} ${i.unit}</td><td>${i.lowStockThreshold} ${i.unit}</td></tr>`,
    )
    .join("");

  await sendEmail({
    to: adminEmail,
    subject: `[Forno] Low Stock Alert — ${items.length} item(s) need restocking`,
    html: `
      <h2>Low Stock Alert</h2>
      <p>The following ingredients are below their stock threshold:</p>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead><tr><th>Ingredient</th><th>Current Stock</th><th>Threshold</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p>Please restock these items soon.</p>
    `,
  });
};
