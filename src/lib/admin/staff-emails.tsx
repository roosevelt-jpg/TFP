import "server-only";

import { StaffInviteEmail } from "@/emails/staff-invite";
import { StaffWelcomeEmail } from "@/emails/staff-welcome";
import { emailLogoSrc } from "@/lib/mail/logo";
import { sendMail } from "@/lib/mail/send";

export async function sendStaffInviteEmail(input: {
  to: string;
  role: string;
  acceptUrl: string;
  invitedBy: string;
}) {
  return sendMail({
    channel: "admin",
    to: input.to,
    subject: "Create your TFP Command profile",
    react: (
      <StaffInviteEmail
        invitedBy={input.invitedBy}
        role={input.role}
        acceptUrl={input.acceptUrl}
        logoUrl={emailLogoSrc()}
      />
    ),
  });
}

export async function sendStaffWelcomeEmail(input: {
  to: string;
  fullName: string;
  role: string;
  deskUrl: string;
}) {
  return sendMail({
    channel: "admin",
    to: input.to,
    subject: "Your TFP Command desk is ready",
    react: (
      <StaffWelcomeEmail
        fullName={input.fullName}
        role={input.role}
        deskUrl={input.deskUrl}
        logoUrl={emailLogoSrc()}
      />
    ),
  });
}
