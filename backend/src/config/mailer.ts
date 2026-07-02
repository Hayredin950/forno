import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { logger } from "../lib/logger";

let transporter: Transporter | null = null;

export const getMailer = async (): Promise<Transporter> => {
  if (transporter) return transporter;

  if (process.env["NODE_ENV"] === "production") {
    transporter = nodemailer.createTransport({
      host: process.env["SMTP_HOST"],
      port: Number(process.env["SMTP_PORT"] ?? 587),
      secure: false,
      auth: {
        user: process.env["SMTP_USER"],
        pass: process.env["SMTP_PASS"],
      },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    logger.info({ user: testAccount.user }, "Ethereal test SMTP account created");
  }

  return transporter;
};
