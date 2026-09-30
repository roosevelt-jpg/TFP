import "server-only";

import { render } from "@react-email/render";
import type { ReactElement } from "react";
import type { ErrorResponse } from "resend";

import { getResend } from "@/lib/clients/resend";
import { isPermanentSendError } from "@/lib/clients/resend-error";
import { formatFrom } from "@/lib/mail/brand";
import {
  emailLogoAttachment,
  readEmailLogoBytes,
} from "@/lib/mail/logo";
import { getGmailSmtpConfig, sendViaGmailSmtp } from "@/lib/mail/smtp";
import { resolveSecret } from "@/lib/secrets/store";
import {
  assertChannelEligible,
  isChannelEligibilityError,
} from "@/lib/funnel/eligibility";
import { logOutboundMessage } from "@/lib/funnel/records";

export type MailChannel = "admin" | "client";

export type SendMailInput = {
  channel: MailChannel;
  to: string | string[];
  subject: string;
  /** Prefer react for branded templates; html is used for SMTP and as fallback. */
  react?: ReactElement;
  html?: string;
  text?: string;
  replyTo?: string;
  /** Override From (defaults by channel). */
  from?: string;
  headers?: Record<string, string>;
  /** Resend-only dedupe key (24h TTL). Ignored on SMTP. */
  idempotencyKey?: string;
  /**
   * When set on client channel mail, runs ChannelEligibility before send.
   * Ops/admin mail skips eligibility.
   */
  eligibility?: {
    customerId?: string | null;
    waitlistId?: string | null;
    purpose: "transactional" | "lifecycle" | "marketing" | "ops";
  };
};

export type SendMailResult = {
  id: string;
  driver: "gmail_smtp" | "resend";
};

export class MailSendError extends Error {
  readonly permanent: boolean;
  readonly driver: "gmail_smtp" | "resend" | "none";
  readonly resendError?: ErrorResponse;

  constructor(
    message: string,
    opts: {
      permanent?: boolean;
      driver?: "gmail_smtp" | "resend" | "none";
      resendError?: ErrorResponse;
    } = {},
  ) {
    super(message);
    this.name = "MailSendError";
    this.permanent = opts.permanent ?? false;
    this.driver = opts.driver ?? "none";
    this.resendError = opts.resendError;
  }
}

export function isPermanentMailError(error: unknown): boolean {
  if (error instanceof MailSendError) return error.permanent;
  return false;
}

async function resolveClientFrom(override?: string) {
  if (override) {
    return formatFrom("The Formula Programme", override);
  }
  const raw =
    (await resolveSecret("RESEND_FROM")) ??
    process.env.RESEND_FROM ??
    "The Formula Programme <hello@theformulaperformance.com>";
  return formatFrom("The Formula Programme", raw);
}

async function resendConfigured() {
  return Boolean(
    (await resolveSecret("RESEND_API_KEY")) ?? process.env.RESEND_API_KEY,
  );
}

async function toHtml(input: SendMailInput): Promise<string> {
  if (input.html) return input.html;
  if (input.react) return render(input.react);
  throw new MailSendError("sendMail requires react or html", { permanent: true });
}

async function sendResend(input: SendMailInput): Promise<SendMailResult> {
  const from = await resolveClientFrom(input.from);
  const content = input.react
    ? { react: input.react }
    : { html: input.html ?? "" };
  const logo = await readEmailLogoBytes();

  const client = await getResend();
  const result = await client.emails.send(
    {
      from,
      to: input.to,
      subject: input.subject,
      replyTo: input.replyTo,
      headers: input.headers,
      text: input.text,
      attachments: [emailLogoAttachment(logo)],
      ...content,
    },
    input.idempotencyKey
      ? { idempotencyKey: input.idempotencyKey }
      : undefined,
  );
  if (result.error) {
    throw new MailSendError(
      `${result.error.name}: ${result.error.message} (${result.error.statusCode})`,
      {
        driver: "resend",
        permanent: isPermanentSendError(result.error),
        resendError: result.error,
      },
    );
  }
  return { id: result.data?.id ?? "resend", driver: "resend" };
}

/** Admin invites can use Gmail. Automation (client) mail is Resend only. */
export async function isMailChannelReady(
  channel: MailChannel,
): Promise<boolean> {
  if (channel === "client") return resendConfigured();
  const smtpReady = Boolean(await getGmailSmtpConfig());
  const resendReady = await resendConfigured();
  return smtpReady || resendReady;
}

/**
 * Admin invites: Gmail SMTP, then Resend.
 * Automation emails (channel client): Resend API only. No SMTP fallback.
 */
export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  if (input.channel === "client" && input.eligibility) {
    const to = Array.isArray(input.to) ? input.to[0] : input.to;
    try {
      await assertChannelEligible({
        channel: "email",
        email: to,
        customerId: input.eligibility.customerId,
        waitlistId: input.eligibility.waitlistId,
        purpose: input.eligibility.purpose,
      });
    } catch (error) {
      if (isChannelEligibilityError(error)) {
        await logOutboundMessage({
          customerId: input.eligibility.customerId,
          waitlistId: input.eligibility.waitlistId,
          channel: "email",
          status: "suppressed",
          failureReason: error instanceof Error ? error.message : "ineligible",
        });
        throw new MailSendError(
          error instanceof Error ? error.message : "Channel not eligible",
          { permanent: true },
        );
      }
      throw error;
    }
  }

  const html = await toHtml(input);
  const resendReady = await resendConfigured();

  if (input.channel === "client") {
    if (!resendReady) {
      throw new MailSendError(
        "Automation email requires RESEND_API_KEY. Gmail SMTP is not used for these sends.",
        { permanent: true, driver: "none" },
      );
    }
    return sendResend({
      ...input,
      html: input.react ? undefined : html,
    });
  }

  const smtpReady = Boolean(await getGmailSmtpConfig());
  const order = ["gmail_smtp", "resend"] as const;

  const errors: string[] = [];

  for (const driver of order) {
    if (driver === "gmail_smtp") {
      if (!smtpReady) continue;
      try {
        return await sendViaGmailSmtp({
          to: input.to,
          subject: input.subject,
          html,
          text: input.text,
          replyTo: input.replyTo,
        });
      } catch (error) {
        errors.push(
          `gmail_smtp: ${error instanceof Error ? error.message : "failed"}`,
        );
      }
      continue;
    }

    if (!resendReady) continue;
    try {
      // Prefer react when present; html covers SMTP-only templates.
      return await sendResend({
        ...input,
        html: input.react ? undefined : html,
      });
    } catch (error) {
      if (error instanceof MailSendError && error.permanent && !smtpReady) {
        throw error;
      }
      errors.push(
        `resend: ${error instanceof Error ? error.message : "failed"}`,
      );
    }
  }

  throw new MailSendError(
    `No mail driver available for channel=${input.channel}. ${errors.join("; ") || "Configure GMAIL_SMTP_* for admin invites, or RESEND_API_KEY for automation email."}`,
    { permanent: !smtpReady && !resendReady },
  );
}
