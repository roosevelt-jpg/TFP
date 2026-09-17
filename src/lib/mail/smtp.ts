import "server-only";

import nodemailer from "nodemailer";

import { formatFrom } from "@/lib/mail/brand";
import {
  EMAIL_LOGO_CID,
  EMAIL_LOGO_FILENAME,
  readEmailLogoBytes,
} from "@/lib/mail/logo";
import { resolveSecret } from "@/lib/secrets/store";

export async function getGmailSmtpConfig() {
  const user =
    (await resolveSecret("GMAIL_SMTP_USER")) ?? process.env.GMAIL_SMTP_USER;
  const pass =
    (await resolveSecret("GMAIL_SMTP_PASS")) ?? process.env.GMAIL_SMTP_PASS;
  const fromRaw =
    (await resolveSecret("GMAIL_SMTP_FROM")) ??
    process.env.GMAIL_SMTP_FROM ??
    user;
  if (!user || !pass || !fromRaw) return null;
  return {
    user,
    pass,
    from: formatFrom("TFP Command", fromRaw),
  };
}

export async function sendViaGmailSmtp(input: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  const config = await getGmailSmtpConfig();
  if (!config) {
    throw new Error("Gmail SMTP is not configured (GMAIL_SMTP_USER / PASS)");
  }

  const logo = await readEmailLogoBytes();

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  const info = await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    attachments: [
      {
        filename: EMAIL_LOGO_FILENAME,
        content: logo,
        contentType: "image/png",
        cid: EMAIL_LOGO_CID,
        contentDisposition: "inline",
      },
    ],
  });

  return { id: info.messageId, driver: "gmail_smtp" as const };
}
