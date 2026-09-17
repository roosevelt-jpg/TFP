import {
  Button,
  Heading,
  Section,
  Text,
} from "@react-email/components";

import { EmailLayout } from "@/emails/components/EmailLayout";
import { email } from "@/emails/components/theme";

type Props = {
  fullName: string;
  role: string;
  deskUrl: string;
  logoUrl: string;
};

export function StaffWelcomeEmail({
  fullName,
  role,
  deskUrl,
  logoUrl,
}: Props) {
  return (
    <EmailLayout
      preview="Your TFP Command desk is ready"
      logoUrl={logoUrl}
      headerMeta="Command"
      footer={
        <Text style={{ margin: 0, fontFamily: email.sans, fontSize: 12, color: email.dim }}>
          The Formula Programme · Performance
        </Text>
      }
    >
      <Section style={{ padding: "28px 34px 8px" }}>
        <Heading
          as="h1"
          style={{
            margin: "0 0 12px",
            fontFamily: email.sans,
            fontSize: 22,
            fontWeight: 700,
            color: email.text,
          }}
        >
          You’re in, {fullName}
        </Heading>
        <Text
          style={{
            margin: "0 0 14px",
            fontFamily: email.sans,
            fontSize: 15,
            lineHeight: "1.55",
            color: email.text,
          }}
        >
          Your profile is complete. Sign in to open your{" "}
          <strong>{role}</strong> desk — scorecard, todos and reports for Kane.
        </Text>
        <Button
          href={deskUrl}
          style={{
            backgroundColor: email.red,
            color: "#FFFFFF",
            fontFamily: email.sans,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            padding: "12px 18px",
            borderRadius: 4,
          }}
        >
          Open My Desk
        </Button>
      </Section>
    </EmailLayout>
  );
}
