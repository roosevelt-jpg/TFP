import { Heading, Link, Section, Text } from "@react-email/components";

import { LEGAL_ENTITY } from "@/lib/legal";

import { EmailLayout } from "./components/EmailLayout";
import { email } from "./components/theme";

type TrialEndingEmailProps = {
  firstName?: string;
  monthlyPrice: string;
  chargeDate: string;
  billingUrl: string | null;
  logoUrl: string;
  supportUrl: string;
};

function Body({
  children,
  spaced,
}: {
  children: React.ReactNode;
  spaced?: boolean;
}) {
  return (
    <Text
      style={{
        margin: spaced ? "0 0 18px" : 0,
        fontFamily: email.sans,
        fontSize: "16px",
        lineHeight: 1.65,
        color: email.muted,
      }}
    >
      {children}
    </Text>
  );
}

// Sent three days before the first membership charge, so it lands before the
// money does. An unannounced charge eight weeks after purchase is the single
// most common cause of a chargeback, and this email exists to prevent that
// rather than to sell anything. It says the amount, the date, and how to stop
// it, in that order.
export function TrialEndingEmail({
  firstName,
  monthlyPrice,
  chargeDate,
  billingUrl,
  logoUrl,
  supportUrl,
}: TrialEndingEmailProps) {
  return (
    <EmailLayout
      preview={`Your membership starts ${chargeDate}. ${monthlyPrice} a month, cancel any time.`}
      logoUrl={logoUrl}
      headerMeta="Membership"
      footer={
        <>
          <Text
            style={{
              margin: "0 0 12px",
              fontFamily: email.sans,
              fontSize: "12px",
              lineHeight: 1.6,
              color: email.dim,
            }}
          >
            You're getting this because you joined the programme at{" "}
            <span style={{ color: email.dim, textDecoration: "none" }}>
              theformulaperformance.com
            </span>
            . Your receipt comes separately from Stripe.
          </Text>
          <Text
            style={{
              margin: 0,
              fontFamily: email.sans,
              fontSize: "12px",
              lineHeight: 1.6,
              color: email.dimmer,
            }}
          >
            &copy; 2026 {LEGAL_ENTITY} &nbsp;&middot;&nbsp;
            <Link
              href={supportUrl}
              style={{
                color: email.dim,
                textDecoration: "none",
                borderBottom: `1px solid ${email.border}`,
              }}
            >
              Talk to the team
            </Link>
          </Text>
        </>
      }
    >
      <Section style={{ padding: "44px 34px 4px" }}>
        <Heading
          as="h1"
          style={{
            margin: 0,
            fontFamily: email.sans,
            fontWeight: "bold",
            fontSize: "34px",
            lineHeight: 1.15,
            letterSpacing: "-0.5px",
            color: email.text,
          }}
        >
          Your membership starts {chargeDate}.
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
          {firstName ? `${firstName}, that's` : "That's"} your eight weeks done,
          and we hope the training has been going well. From {chargeDate} your
          membership continues at {monthlyPrice} a month, taken from the card
          you paid with.
        </Text>
      </Section>

      {/* Cancelling is one click from here on purpose. Someone who wants out
          and cannot find the door disputes the charge instead. */}
      <Section style={{ padding: "22px 34px 0" }}>
        <Body spaced={Boolean(billingUrl)}>
          Nothing changes on your end. If now isn't the time, cancel before then
          and you won't be charged.
        </Body>
        {billingUrl && (
          <Body>
            <Link
              href={billingUrl}
              style={{
                color: email.text,
                textDecoration: "none",
                borderBottom: `1px solid ${email.border}`,
              }}
            >
              Manage your membership
            </Link>
          </Body>
        )}
      </Section>

      <Section style={{ padding: "30px 34px 0" }}>
        <Text
          style={{
            margin: 0,
            fontFamily: email.sans,
            fontSize: "16px",
            color: email.muted,
          }}
        >
          Keep going. <span style={{ color: email.text }}>Kane</span>
        </Text>
      </Section>
    </EmailLayout>
  );
}

TrialEndingEmail.PreviewProps = {
  firstName: "Ahmed",
  monthlyPrice: "£79",
  chargeDate: "22 September",
  billingUrl: "https://billing.stripe.com/p/login/test",
  logoUrl: "/email/logo.png",
  supportUrl: "https://example.com/support",
} satisfies TrialEndingEmailProps;
