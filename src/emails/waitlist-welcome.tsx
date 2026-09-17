import { Heading, Hr, Img, Link, Section, Text } from "@react-email/components";

import { LEGAL_ENTITY } from "@/lib/legal";

import { EmailLayout } from "./components/EmailLayout";
import { email } from "./components/theme";

type WaitlistWelcomeEmailProps = {
  firstName?: string;
  waitlistRef: string;
  logoUrl: string;
  communityImageUrl: string;
  instagramUrl: string;
  unsubscribeUrl: string;
};

export function WaitlistWelcomeEmail({
  firstName,
  waitlistRef,
  logoUrl,
  communityImageUrl,
  instagramUrl,
  unsubscribeUrl,
}: WaitlistWelcomeEmailProps) {
  return (
    <EmailLayout
      preview="You're on the early-access list. We'll email you the moment your spot opens."
      logoUrl={logoUrl}
      headerMeta={`#${waitlistRef}`}
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
            . No payment has been taken.
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
              href={unsubscribeUrl}
              style={{
                color: email.dim,
                textDecoration: "none",
                borderBottom: `1px solid ${email.border}`,
              }}
            >
              Leave the waitlist
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
          You're on the list.
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
          Welcome{firstName ? `, ${firstName}` : ""}. You've reserved your
          early-access spot for the 8-week programme and your AI coach. No
          payment today. Here's what happens next.
        </Text>
      </Section>

      <Section style={{ padding: "28px 34px 0" }}>
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
          What happens next
        </Heading>
        <Text
          style={{
            margin: 0,
            fontFamily: email.sans,
            fontSize: "15px",
            lineHeight: 1.65,
            color: email.muted,
          }}
        >
          The moment a place opens, we'll email you to check out. You'll lock in
          early-access pricing, your programme lands instantly, and your AI
          coach goes live on WhatsApp at the number you gave us.
        </Text>
      </Section>

      <Section style={{ padding: "24px 34px 0" }}>
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
          Get a head start
        </Heading>
        <Text
          style={{
            margin: "0 0 16px",
            fontFamily: email.sans,
            fontSize: "15px",
            lineHeight: 1.6,
            color: email.muted,
          }}
        >
          While you wait, follow Kane for daily training and nutrition tips, and
          just reply to this email with your main goal so your coach can hit the
          ground running.
        </Text>
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
                href={instagramUrl}
                style={{
                  display: "inline-block",
                  fontFamily: email.sans,
                  fontSize: "15px",
                  fontWeight: "bold",
                  color: email.text,
                  textDecoration: "none",
                }}
              >
                Follow @kanem14
              </Link>
            </td>
          </tr>
        </table>
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
          Talk soon. <span style={{ color: email.text }}>Kane</span>
        </Text>
      </Section>
    </EmailLayout>
  );
}

WaitlistWelcomeEmail.PreviewProps = {
  firstName: "Ahmed",
  waitlistRef: "WL-48217",
  logoUrl: "/email/logo.png",
  communityImageUrl: "https://theformulaperformance.com/email/community.jpg",
  instagramUrl: "https://instagram.com/kanem14",
  unsubscribeUrl:
    "mailto:info@theformulaperformance.com?subject=Leave%20the%20waitlist",
} satisfies WaitlistWelcomeEmailProps;

export default WaitlistWelcomeEmail;
