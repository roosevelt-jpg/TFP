import { Heading, Section, Text } from "@react-email/components";

import { LEGAL_ENTITY } from "@/lib/legal";

import { EmailLayout } from "./components/EmailLayout";
import { email } from "./components/theme";

type SupportReceivedEmailProps = {
  firstName?: string;
  requestType: string;
  logoUrl: string;
};

export function SupportReceivedEmail({
  firstName,
  requestType,
  logoUrl,
}: SupportReceivedEmailProps) {
  return (
    <EmailLayout
      preview="We've got your request — the team will be in touch within one working day."
      logoUrl={logoUrl}
      headerMeta="Support"
      footer={
        <Text
          style={{
            margin: 0,
            fontFamily: email.sans,
            fontSize: "12px",
            lineHeight: 1.6,
            color: email.dimmer,
          }}
        >
          &copy; 2026 {LEGAL_ENTITY} &nbsp;&middot;&nbsp; This is a confirmation
          that we received your request.
        </Text>
      }
    >
      <Section style={{ padding: "44px 34px 4px" }}>
        <Heading
          as="h1"
          style={{
            margin: 0,
            fontFamily: email.serif,
            fontWeight: "normal",
            fontSize: "42px",
            lineHeight: 1.06,
            color: email.text,
          }}
        >
          We're <em style={{ fontStyle: "italic" }}>on it.</em>
        </Heading>
        <Text
          style={{
            margin: "18px 0 0",
            fontFamily: email.sans,
            fontSize: "16px",
            lineHeight: 1.65,
            color: email.muted,
          }}
        >
          Thanks{firstName ? `, ${firstName}` : ""}. We've logged your{" "}
          <strong style={{ color: email.text, fontWeight: "bold" }}>
            {requestType}
          </strong>{" "}
          request and a member of the team will reply to this email within{" "}
          <strong style={{ color: email.text, fontWeight: "bold" }}>
            one working day
          </strong>
          .
        </Text>
      </Section>

      <Section style={{ padding: "24px 34px 12px" }}>
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          role="presentation"
          style={{
            backgroundColor: email.panel,
            border: `1px solid ${email.hairline}`,
            borderRadius: "5px",
          }}
        >
          <tr>
            <td style={{ padding: "18px 20px" }}>
              <Text
                style={{
                  margin: "0 0 6px",
                  fontFamily: email.sans,
                  fontSize: "11px",
                  fontWeight: "bold",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: email.dim,
                }}
              >
                What happens next
              </Text>
              <Text
                style={{
                  margin: 0,
                  fontFamily: email.sans,
                  fontSize: "14px",
                  lineHeight: 1.65,
                  color: email.muted,
                }}
              >
                We'll review what you sent and get back to you by email. No need
                to reply again — just keep an eye on your inbox.
              </Text>
            </td>
          </tr>
        </table>
      </Section>

      <Section style={{ padding: "18px 34px 6px" }}>
        <Text
          style={{
            margin: 0,
            fontFamily: email.serif,
            fontStyle: "italic",
            fontSize: "18px",
            color: email.muted,
          }}
        >
          Talk soon.{" "}
          <span style={{ color: email.text }}>— The Formula team</span>
        </Text>
      </Section>
    </EmailLayout>
  );
}

SupportReceivedEmail.PreviewProps = {
  firstName: "Ahmed",
  requestType: "general question",
  logoUrl: "https://theformulaperformance.com/email/logo.png",
} satisfies SupportReceivedEmailProps;

export default SupportReceivedEmail;
