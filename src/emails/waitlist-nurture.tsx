import {
  Button,
  Heading,
  Section,
  Text,
} from "@react-email/components";

import { EmailLayout } from "@/emails/components/EmailLayout";
import { email } from "@/emails/components/theme";

type Props = {
  firstName?: string;
  day: 2 | 5;
  ctaUrl: string;
  logoUrl: string;
};

export function WaitlistNurtureEmail({
  firstName,
  day,
  ctaUrl,
  logoUrl,
}: Props) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const copy =
    day === 2
      ? {
          preview: "What the first week of The Formula actually looks like",
          heading: "Week one, without the fluff",
          body: `${greeting} Most people overcomplicate day one. You get the programme PDF, open WhatsApp, and your Performance Coach sets the first check-in. That’s it.`,
          cta: "See how it works",
        }
      : {
          preview: "Founder seats won’t stay open",
          heading: "When doors open, speed matters",
          body: `${greeting} Founder places are capped. When we email your invite, finishing checkout the same day is what locks the discount — not “I’ll do it later.”`,
          cta: "Keep my spot warm",
        };

  return (
    <EmailLayout
      preview={copy.preview}
      logoUrl={logoUrl}
      headerMeta="Waitlist"
      footer={
        <Text style={{ margin: 0, fontFamily: email.sans, fontSize: 12, color: email.dim }}>
          The Formula Programme · You’re on the waitlist
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
          {copy.heading}
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
          {copy.body}
        </Text>
        <Button
          href={ctaUrl}
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
          {copy.cta}
        </Button>
      </Section>
    </EmailLayout>
  );
}
