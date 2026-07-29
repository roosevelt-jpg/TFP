import { Heading, Section, Text } from "@react-email/components";

import { EmailLayout } from "./components/EmailLayout";
import { email } from "./components/theme";

type SupportNotificationEmailProps = {
  requestType: string;
  name: string;
  fromEmail: string;
  whatsapp: string | null;
  message: string | null;
  logoUrl: string;
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td
        style={{
          padding: "10px 0",
          borderBottom: `1px solid ${email.hairline}`,
          verticalAlign: "top",
          width: "120px",
          fontFamily: email.sans,
          fontSize: "12px",
          fontWeight: "bold",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          color: email.dim,
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: "10px 0",
          borderBottom: `1px solid ${email.hairline}`,
          verticalAlign: "top",
          fontFamily: email.sans,
          fontSize: "14px",
          lineHeight: 1.6,
          color: email.text,
        }}
      >
        {value}
      </td>
    </tr>
  );
}

export function SupportNotificationEmail({
  requestType,
  name,
  fromEmail,
  whatsapp,
  message,
  logoUrl,
}: SupportNotificationEmailProps) {
  return (
    <EmailLayout
      preview={`New ${requestType} request from ${name}`}
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
          Reply to this email to respond to {name} directly.
        </Text>
      }
    >
      <Section style={{ padding: "34px 34px 4px" }}>
        <Text
          style={{
            margin: "0 0 10px",
            fontFamily: email.sans,
            fontSize: "11px",
            fontWeight: "bold",
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            color: email.red,
          }}
        >
          New support request
        </Text>
        <Heading
          as="h1"
          style={{
            margin: 0,
            fontFamily: email.sans,
            fontWeight: "bold",
            fontSize: "22px",
            lineHeight: 1.2,
            color: email.text,
          }}
        >
          {requestType}
        </Heading>
      </Section>

      <Section style={{ padding: "20px 34px 8px" }}>
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          role="presentation"
        >
          <Field label="Name" value={name} />
          <Field label="Email" value={fromEmail} />
          {whatsapp ? <Field label="WhatsApp" value={whatsapp} /> : null}
          <Field label="Type" value={requestType} />
        </table>
      </Section>

      {message ? (
        <Section style={{ padding: "12px 34px 8px" }}>
          <Text
            style={{
              margin: "0 0 8px",
              fontFamily: email.sans,
              fontSize: "11px",
              fontWeight: "bold",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              color: email.dim,
            }}
          >
            Message
          </Text>
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
              <td style={{ padding: "16px 18px" }}>
                <Text
                  style={{
                    margin: 0,
                    fontFamily: email.sans,
                    fontSize: "14px",
                    lineHeight: 1.65,
                    color: email.text,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {message}
                </Text>
              </td>
            </tr>
          </table>
        </Section>
      ) : null}
    </EmailLayout>
  );
}

SupportNotificationEmail.PreviewProps = {
  requestType: "general question",
  name: "Ahmed Elamin",
  fromEmail: "ahmed@example.com",
  whatsapp: "+447700900123",
  message: "Hey, quick question about when the WhatsApp coach goes live.",
  logoUrl: "https://theformulaperformance.com/email/logo.png",
} satisfies SupportNotificationEmailProps;

export default SupportNotificationEmail;
