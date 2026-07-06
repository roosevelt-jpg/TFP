import { AbortTaskRunError, logger, retry, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { resend } from "@/lib/clients/resend";
import { siteConfig } from "@/config/site";
import { SupportNotificationEmail } from "@/emails/support-notification";
import { SupportReceivedEmail } from "@/emails/support-received";
import { env } from "@/env";

import { emailQueue } from "./queues";

const TEAM_INBOX = siteConfig.contactEmail;

const senderFrom = env.RESEND_FROM.includes("<")
  ? env.RESEND_FROM
  : `${siteConfig.name} <${env.RESEND_FROM}>`;

export const sendSupportEmails = schemaTask({
  id: "send-support-emails",
  schema: z.object({
    requestType: z.string(),
    name: z.string(),
    email: z.email(),
    whatsapp: z.string().nullable(),
    message: z.string().nullable(),
    firstName: z.string().optional(),
  }),
  queue: emailQueue,
  retry: { maxAttempts: 1 },
  maxDuration: 30,
  run: async ({ requestType, name, email, whatsapp, message, firstName }) => {
    let lastError = "Failed to notify the support team";

    await retry
      .onThrow(
        async ({ attempt }) => {
          logger.info("Sending support team notification", {
            to: TEAM_INBOX,
            requestType,
            attempt,
          });
          const result = await resend.emails.send({
            from: senderFrom,
            to: TEAM_INBOX,
            replyTo: email,
            subject: `New ${requestType} - ${name}`,
            react: (
              <SupportNotificationEmail
                requestType={requestType}
                name={name}
                fromEmail={email}
                whatsapp={whatsapp}
                message={message}
                logoUrl={env.EMAIL_LOGO_URL}
              />
            ),
          });
          if (result.error) {
            lastError = `${result.error.name}: ${result.error.message} (${result.error.statusCode})`;
            logger.warn("Resend rejected the team notification", {
              requestType,
              attempt,
              message: result.error.message,
              name: result.error.name,
              statusCode: result.error.statusCode,
            });
            throw result.error;
          }
          return result.data;
        },
        { maxAttempts: 3, minTimeoutInMs: 1000, factor: 2 },
      )
      .catch(() => {
        throw new AbortTaskRunError(lastError);
      });

    const ack = await resend.emails
      .send({
        from: senderFrom,
        to: email,
        subject: "We've got your request - The Formula Programme",
        react: (
          <SupportReceivedEmail
            firstName={firstName}
            requestType={requestType}
            logoUrl={env.EMAIL_LOGO_URL}
          />
        ),
      })
      .catch((cause) => ({
        data: null,
        error: {
          message: cause instanceof Error ? cause.message : "send failed",
        },
      }));

    if (ack.error) {
      logger.warn("Support acknowledgement not sent", {
        to: email,
        message: ack.error.message,
      });
    }

    logger.info("Support emails processed", {
      requestType,
      ackId: ack.data?.id,
    });
    return { ackId: ack.data?.id };
  },
});
