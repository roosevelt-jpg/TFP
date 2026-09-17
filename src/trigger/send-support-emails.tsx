import { AbortTaskRunError, logger, retry, schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { siteConfig } from "@/config/site";
import { SupportNotificationEmail } from "@/emails/support-notification";
import { SupportReceivedEmail } from "@/emails/support-received";
import { emailLogoSrc } from "@/lib/mail/logo";
import { sendMail } from "@/lib/mail/send";

import { emailQueue } from "./queues";

const TEAM_INBOX = siteConfig.contactEmail;

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
          return sendMail({
            channel: "client",
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
                logoUrl={emailLogoSrc()}
              />
            ),
          });
        },
        { maxAttempts: 3, minTimeoutInMs: 1000, factor: 2 },
      )
      .catch((cause) => {
        lastError =
          cause instanceof Error ? cause.message : lastError;
        throw new AbortTaskRunError(lastError);
      });

    let ackId: string | undefined;
    try {
      const ack = await sendMail({
        channel: "client",
        to: email,
        subject: "We've got your request - The Formula Programme",
        react: (
          <SupportReceivedEmail
            firstName={firstName}
            requestType={requestType}
            logoUrl={emailLogoSrc()}
          />
        ),
      });
      ackId = ack.id;
    } catch (cause) {
      logger.warn("Support acknowledgement not sent", {
        to: email,
        message: cause instanceof Error ? cause.message : "send failed",
      });
    }

    logger.info("Support emails processed", {
      requestType,
      ackId,
    });
    return { ackId };
  },
});
