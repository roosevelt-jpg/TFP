import { Heading, Hr, Img, Link, Section, Text } from "@react-email/components";

import { LEGAL_ENTITY } from "@/lib/legal";

import { EmailLayout } from "./components/EmailLayout";
import { email } from "./components/theme";

type PurchaseWelcomeEmailProps = {
  firstName?: string;
  orderRef: string;
  programmeWeeks: number;
  monthlyPrice: string;
  rolloverDate: string;
  pdfUrl: string | null;
  whatsappUrl: string;
  billingUrl: string | null;
  logoUrl: string;
  communityImageUrl: string;
  supportUrl: string;
};

// Buttons are a table cell with padding on the td, because Outlook's Word
// engine ignores padding on an anchor and collapses the button.
function Button({ href, label }: { href: string; label: string }) {
  return (
    <table cellPadding={0} cellSpacing={0} border={0} role="presentation">
      <tr>
        <td
          style={{
            border: `1px solid ${email.text}`,
            borderRadius: "3px",
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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </Heading>
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
        margin: spaced ? "0 0 16px" : 0,
        fontFamily: email.sans,
        fontSize: "15px",
        lineHeight: 1.65,
        color: email.muted,
      }}
    >
      {children}
    </Text>
  );
}

export function PurchaseWelcomeEmail({
  firstName,
  orderRef,
  programmeWeeks,
  monthlyPrice,
  rolloverDate,
  pdfUrl,
  whatsappUrl,
  billingUrl,
  logoUrl,
  communityImageUrl,
  supportUrl,
}: PurchaseWelcomeEmailProps) {
  return (
    <EmailLayout
      preview="Your programme is ready. Message your coach on WhatsApp to get started."
      logoUrl={logoUrl}
      headerMeta={`#${orderRef}`}
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
          You're in.
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
          Welcome{firstName ? `, ${firstName}` : ""}. Your place on the{" "}
          {programmeWeeks}-week programme is confirmed and your training plan is
          attached below. One thing left to do.
        </Text>
      </Section>

      {/* First, because nothing starts until they message. */}
      <Section style={{ padding: "30px 34px 0" }}>
        <SectionHeading>Message your coach</SectionHeading>
        <Body spaced>
          Your coach can't message you until you message them first, so this is
          the step that gets your coaching started. Tap below, send the message
          that appears, and you'll hear back from them shortly.
        </Body>
        <Button href={whatsappUrl} label="Say hello on WhatsApp" />
      </Section>

      <Section style={{ padding: "28px 34px 0" }}>
        <SectionHeading>Your programme</SectionHeading>
        {pdfUrl ? (
          <>
            <Body spaced>
              Kane's full training system, built to run for {programmeWeeks}{" "}
              weeks. Save it to your phone so you have it in the gym.
            </Body>
            <Button href={pdfUrl} label="Download your plan" />
          </>
        ) : (
          /* Watermarking failed for good. Better to say so than to link at a
             file that is not there. */
          <Body>
            Your plan is being prepared and will follow in a separate email
            shortly. Your coach has everything they need in the meantime.
          </Body>
        )}
      </Section>

      <Section style={{ padding: "28px 34px 0" }}>
        <SectionHeading>What happens next</SectionHeading>
        <Body spaced={Boolean(billingUrl)}>
          Your first block starts as soon as you and your coach have spoken.
          After {programmeWeeks} weeks your membership continues at{" "}
          {monthlyPrice} a month, starting {rolloverDate}, and you can cancel
          any time before then.
        </Body>
        {/* The permanent login link, not a portal session: a session would have
            expired long before someone opens this to change a card. */}
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
              Manage your card or cancel
            </Link>
          </Body>
        )}
      </Section>

      <Section style={{ padding: "34px 34px 0" }}>
        <Img
          src={communityImageUrl}
          alt="Kane with the Collective 365 community"
          width="532"
          height="299"
          style={{
            display: "block",
            width: "100%",
            maxWidth: "532px",
            height: "auto",
            border: `1px solid ${email.hairline}`,
            borderRadius: "6px",
          }}
        />
        <Text
          style={{
            margin: "12px 0 0",
            fontFamily: email.sans,
            fontSize: "12px",
            letterSpacing: "0.3px",
            color: email.dim,
          }}
        >
          You're one of us now.
        </Text>
      </Section>

      <Section style={{ padding: "32px 34px 6px" }}>
        <Hr
          style={{
            margin: "0 0 22px",
            border: "none",
            borderTop: `1px solid ${email.hairline}`,
          }}
        />
        <Text
          style={{
            margin: 0,
            fontFamily: email.sans,
            fontSize: "16px",
            color: email.muted,
          }}
        >
          Let's get to work. <span style={{ color: email.text }}>Kane</span>
        </Text>
      </Section>
    </EmailLayout>
  );
}

PurchaseWelcomeEmail.PreviewProps = {
  firstName: "Ahmed",
  orderRef: "FP-J25J9RN8",
  programmeWeeks: 8,
  monthlyPrice: "£79",
  rolloverDate: "21 September",
  pdfUrl: "https://theformulaperformance.com/api/pdf/preview-token",
  whatsappUrl:
    "https://wa.me/447466396911?text=Hi%2C%20I%27d%20like%20to%20start%20my%20coaching",
  billingUrl: "https://billing.stripe.com/p/login/test_9B63cu9vWdjzgnO3v7dfG00",
  logoUrl: "https://theformulaperformance.com/email/logo.png",
  communityImageUrl: "https://theformulaperformance.com/email/community.jpg",
  supportUrl: "https://theformulaperformance.com/support",
} satisfies PurchaseWelcomeEmailProps;

export default PurchaseWelcomeEmail;
