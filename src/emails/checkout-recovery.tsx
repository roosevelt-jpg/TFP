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
  variant: "nudge" | "objection";
  checkoutUrl: string;
  amountDueTodayLabel: string;
  renewalDisclosure: string;
  logoUrl: string;
};

export function CheckoutRecoveryEmail({
  firstName,
  variant,
  checkoutUrl,
  amountDueTodayLabel,
  renewalDisclosure,
  logoUrl,
}: Props) {
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const preview =
    variant === "nudge"
      ? `Your spot is still open — ${amountDueTodayLabel} today.`
      : `Still thinking it over? Your founder place is waiting.`;
  const heading =
    variant === "nudge"
      ? "You left checkout before finishing"
      : "Common questions, straight answers";
  const body =
    variant === "nudge"
      ? `${greeting} Your details are saved and nothing was charged. Finish in a couple of minutes and your programme unlocks the same day.`
      : `${greeting} Most people pause over the price or the commitment. ${renewalDisclosure} Cancel anytime from your billing portal — no retention calls.`;

  return (
    <EmailLayout
      preview={preview}
      logoUrl={logoUrl}
      headerMeta="Checkout"
      footer={
        <Text
          style={{
            margin: 0,
            fontFamily: email.sans,
            fontSize: 12,
            color: email.dim,
          }}
        >
          The Formula Programme · You’re getting this because you started
          checkout and didn’t finish.
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
          {heading}
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
          {body}
        </Text>
        <Button
          href={checkoutUrl}
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
          Finish signing up — {amountDueTodayLabel}
        </Button>
      </Section>
    </EmailLayout>
  );
}
