import { Button, Heading, Section, Text } from "@react-email/components";

import { EmailLayout } from "@/emails/components/EmailLayout";
import { email } from "@/emails/components/theme";

type Props = {
  firstName?: string;
  resumeUrl: string;
  logoUrl: string;
};

export function OnboardingResumeEmail({
  firstName,
  resumeUrl,
  logoUrl,
}: Props) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  return (
    <EmailLayout
      preview="One step left — finish your coaching intake."
      logoUrl={logoUrl}
      headerMeta="Programme"
      footer={
        <Text
          style={{
            margin: 0,
            fontFamily: email.sans,
            fontSize: 12,
            color: email.dim,
          }}
        >
          The Formula Programme · You’re getting this because your membership
          is paid and the coaching intake is still open.
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
          One step left
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
          {greeting} Your payment is in. The programme starts once the coaching
          intake is done — goal, training days, and anything we should know
          about injuries. It takes a couple of minutes.
        </Text>
        <Button
          href={resumeUrl}
          style={{
            backgroundColor: email.text,
            color: "#FFFFFF",
            fontFamily: email.sans,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
            padding: "12px 18px",
            borderRadius: 4,
          }}
        >
          Finish coaching intake
        </Button>
      </Section>
    </EmailLayout>
  );
}
