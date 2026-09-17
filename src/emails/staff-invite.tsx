import {
  Button,
  Heading,
  Section,
  Text,
} from "@react-email/components";

import { EmailLayout } from "@/emails/components/EmailLayout";
import { email } from "@/emails/components/theme";

type Props = {
  invitedBy: string;
  role: string;
  acceptUrl: string;
  logoUrl: string;
};

export function StaffInviteEmail({
  invitedBy,
  role,
  acceptUrl,
  logoUrl,
}: Props) {
  return (
    <EmailLayout
      preview={`Create your TFP Command profile as ${role}`}
      logoUrl={logoUrl}
      headerMeta="Command invite"
      footer={
        <Text style={{ margin: 0, fontFamily: email.sans, fontSize: 12, color: email.dim }}>
          The Formula Programme · Performance · Invite expires in 7 days
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
          Create your profile
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
          <strong>{invitedBy}</strong> invited you to TFP Command as{" "}
          <strong>{role}</strong>. Fill in your details to unlock your own
          dashboard.
        </Text>
        <Button
          href={acceptUrl}
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
          Create my profile
        </Button>
      </Section>
    </EmailLayout>
  );
}
