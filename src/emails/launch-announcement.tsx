import { Heading, Link, Section, Text } from "@react-email/components";

import { LEGAL_ENTITY } from "@/lib/legal";

import { EmailLayout } from "./components/EmailLayout";
import { email } from "./components/theme";

type LaunchAnnouncementEmailProps = {
  firstName?: string;
  checkoutUrl: string;
  promoCode: string;
  promoLimit: number;
  promoExpiresAt: string;
  priceToday: string;
  discountedPrice: string;
  monthlyPrice: string;
  programmeWeeks: number;
  logoUrl: string;
  supportUrl: string;
};

function Button({ href, label }: { href: string; label: string }) {
  return (
    <table cellPadding={0} cellSpacing={0} border={0} role="presentation">
      <tr>
        <td
          style={{
            border: `1px solid ${email.text}`,
            borderRadius: "3px",
            // Padding on the td, not the <a>: Outlook's Word engine ignores
            // anchor padding and would collapse the button.
            padding: "13px 24px",
          }}
        >
          <Link
            href={href}
            style={{
              display: "inline-block",
              fontFamily: email.sans,
              fontSize: "15px",
              fontWeight: "bold",
              color: email.text,
              textDecoration: "none",
            }}
          >
            {label}
          </Link>
        </td>
      </tr>
    </table>
  );
}

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

// Sent once, by hand, on launch day. These people asked to be told first and
// have waited, so it opens by keeping that promise rather than selling.
export function LaunchAnnouncementEmail({
  firstName,
  checkoutUrl,
  promoCode,
  promoLimit,
  promoExpiresAt,
  priceToday,
  discountedPrice,
  monthlyPrice,
  programmeWeeks,
  logoUrl,
  supportUrl,
}: LaunchAnnouncementEmailProps) {
  return (
    <EmailLayout
      preview={`Doors are open. ${discountedPrice} with your waitlist code, until ${promoExpiresAt}.`}
      logoUrl={logoUrl}
      headerMeta="Doors open"
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
            You're getting this because you joined the waitlist at{" "}
            <span style={{ color: email.dim, textDecoration: "none" }}>
              theformulaperformance.com
            </span>
            .
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
          Doors are open.
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
          {firstName ? `${firstName}, you` : "You"} asked to hear first, so here
          it is. The Formula Programme is live: {programmeWeeks} weeks of Kane's
          training system, with a Performance Coach in your WhatsApp the whole
          way.
        </Text>
      </Section>

      <Section style={{ padding: "30px 34px 0" }}>
        <Heading
          as="h2"
          style={{
            margin: "0 0 8px",
            fontFamily: email.sans,
            fontWeight: "bold",
            fontSize: "20px",
            lineHeight: 1.25,
            color: email.text,
          }}
        >
          Half price, for the next 24 hours
        </Heading>
        {/* The code is stated in full rather than pre-applied: someone who
            forwards this or comes back later still knows what to type. The
            limit is Stripe's real max_redemptions, so the urgency is a fact
            rather than a device. */}
        <Body spaced>
          You're hearing this before anyone else, and{" "}
          <strong style={{ color: email.text }}>{promoCode}</strong> takes the
          programme from {priceToday} to {discountedPrice}. It runs out at{" "}
          {promoExpiresAt}, or after {promoLimit} people, whichever comes first.
          After {programmeWeeks} weeks your membership continues at{" "}
          {monthlyPrice} a month, and you can cancel any time before then.
        </Body>
        <Button href={checkoutUrl} label="Claim your place" />
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
          See you inside. <span style={{ color: email.text }}>Kane</span>
        </Text>
      </Section>
    </EmailLayout>
  );
}

LaunchAnnouncementEmail.PreviewProps = {
  firstName: "Ahmed",
  checkoutUrl: "https://train.theformulaperformance.com/checkout?t=token",
  promoCode: "FORMULA50",
  promoLimit: 50,
  promoExpiresAt: "30 July at 12:00",
  priceToday: "£149",
  discountedPrice: "£74.50",
  monthlyPrice: "£79",
  programmeWeeks: 8,
  logoUrl: "/email/logo.png",
  supportUrl: "https://example.com/support",
} satisfies LaunchAnnouncementEmailProps;
