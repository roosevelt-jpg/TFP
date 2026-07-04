import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { LEGAL_ENTITY } from "@/lib/legal";

type WaitlistWelcomeEmailProps = {
  firstName?: string;
  waitlistRef: string;
  logoUrl: string;
  communityImageUrl: string;
  instagramUrl: string;
  unsubscribeUrl: string;
};

const BG = "#060605";
const CARD = "#0A0A0A";
const PANEL = "#0E0D0C";
const HAIRLINE = "#1F1D1B";
const BORDER = "#322E2A";
const TEXT = "#F4F1EC";
const MUTED = "#9A938C";
const DIM = "#6E6862";
const DIMMER = "#4A453F";
const RED = "#D8231C";
const GOOD = "#3BA776";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, Helvetica, sans-serif";

export function WaitlistWelcomeEmail({
  firstName,
  waitlistRef,
  logoUrl,
  communityImageUrl,
  instagramUrl,
  unsubscribeUrl,
}: WaitlistWelcomeEmailProps) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="dark light" />
        <meta name="supported-color-schemes" content="dark light" />
      </Head>
      <Preview>
        You're on the early-access list — we'll email you the moment your spot
        opens.
      </Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: BG }}>
        <Container
          style={{
            width: "600px",
            maxWidth: "600px",
            margin: "30px auto",
            backgroundColor: CARD,
            border: `1px solid ${HAIRLINE}`,
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "3px",
              backgroundColor: RED,
              fontSize: 0,
              lineHeight: 0,
            }}
          >
            &nbsp;
          </div>

          <Section style={{ padding: "24px 34px" }}>
            <table
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              role="presentation"
            >
              <tr>
                <td align="left" style={{ verticalAlign: "middle" }}>
                  <Img
                    src={logoUrl}
                    alt="The Formula Programme"
                    width="179"
                    height="26"
                    style={{
                      display: "block",
                      border: 0,
                      height: "26px",
                      width: "179px",
                    }}
                  />
                </td>
                <td
                  align="right"
                  style={{
                    verticalAlign: "middle",
                    fontFamily: SANS,
                    fontSize: "12px",
                    color: DIM,
                  }}
                >
                  #{waitlistRef}
                </td>
              </tr>
            </table>
          </Section>

          <Section style={{ padding: "0 34px" }}>
            <Hr
              style={{
                margin: 0,
                border: "none",
                borderTop: `1px solid ${HAIRLINE}`,
              }}
            />
          </Section>

          <Section style={{ padding: "44px 34px 4px" }}>
            <Text
              style={{
                margin: "0 0 18px",
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: "bold",
                letterSpacing: "2.5px",
                textTransform: "uppercase",
                color: GOOD,
              }}
            >
              &#10003;&nbsp;&nbsp;You're on the list
            </Text>
            <Heading
              as="h1"
              style={{
                margin: 0,
                fontFamily: SERIF,
                fontWeight: "normal",
                fontSize: "44px",
                lineHeight: 1.08,
                color: TEXT,
              }}
            >
              You're <em style={{ fontStyle: "italic" }}>on the list.</em>
            </Heading>
            <Text
              style={{
                margin: "18px 0 0",
                fontFamily: SANS,
                fontSize: "16px",
                lineHeight: 1.65,
                color: MUTED,
              }}
            >
              Welcome{firstName ? `, ${firstName}` : ""}. You've reserved your
              early-access spot for the 8-week programme and your AI coach. No
              payment today — here's what happens next.
            </Text>
          </Section>

          <Section style={{ padding: "26px 34px 8px" }}>
            <table
              width="100%"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              role="presentation"
              style={{
                backgroundColor: PANEL,
                border: `1px solid ${HAIRLINE}`,
                borderRadius: "5px",
              }}
            >
              <tr>
                <td style={{ padding: "18px 20px" }}>
                  <Text
                    style={{
                      margin: "0 0 6px",
                      fontFamily: SANS,
                      fontSize: "11px",
                      fontWeight: "bold",
                      letterSpacing: "1.5px",
                      textTransform: "uppercase",
                      color: DIM,
                    }}
                  >
                    What happens next
                  </Text>
                  <Text
                    style={{
                      margin: 0,
                      fontFamily: SANS,
                      fontSize: "14px",
                      lineHeight: 1.65,
                      color: MUTED,
                    }}
                  >
                    The moment a place opens, we'll email you to check out.
                    You'll lock in early-access pricing, your programme lands
                    instantly, and your AI coach goes live on WhatsApp at the
                    number you gave us.
                  </Text>
                </td>
              </tr>
            </table>
          </Section>

          <Section style={{ padding: "24px 34px 0" }}>
            <Heading
              as="h2"
              style={{
                margin: "0 0 8px",
                fontFamily: SERIF,
                fontWeight: "normal",
                fontSize: "22px",
                lineHeight: 1.2,
                color: TEXT,
              }}
            >
              Get a head start
            </Heading>
            <Text
              style={{
                margin: "0 0 16px",
                fontFamily: SANS,
                fontSize: "15px",
                lineHeight: 1.6,
                color: MUTED,
              }}
            >
              While you wait, follow Kane for daily training and nutrition tips
              — and just reply to this email with your main goal so your coach
              can hit the ground running.
            </Text>
            <table
              cellPadding={0}
              cellSpacing={0}
              border={0}
              role="presentation"
            >
              <tr>
                <td
                  style={{
                    border: `1px solid ${BORDER}`,
                    borderLeft: `3px solid ${RED}`,
                    borderRadius: "3px",
                    // Padding on the td, not the <a>: Outlook's Word engine
                    // ignores anchor padding and would collapse the button.
                    padding: "13px 24px",
                  }}
                >
                  <Link
                    href={instagramUrl}
                    style={{
                      display: "inline-block",
                      fontFamily: SANS,
                      fontSize: "15px",
                      fontWeight: "bold",
                      color: TEXT,
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
                border: `1px solid ${HAIRLINE}`,
                borderRadius: "6px",
              }}
            />
            <Text
              style={{
                margin: "12px 0 0",
                fontFamily: SANS,
                fontSize: "12px",
                letterSpacing: "0.3px",
                color: DIM,
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
                borderTop: `1px solid ${HAIRLINE}`,
              }}
            />
            <Text
              style={{
                margin: 0,
                fontFamily: SERIF,
                fontStyle: "italic",
                fontSize: "18px",
                color: MUTED,
              }}
            >
              Talk soon. <span style={{ color: TEXT }}>— Kane</span>
            </Text>
          </Section>

          <Section style={{ padding: "22px 34px 30px" }}>
            <Text
              style={{
                margin: "0 0 12px",
                fontFamily: SANS,
                fontSize: "12px",
                lineHeight: 1.6,
                color: DIM,
              }}
            >
              You're getting this because you joined the waitlist at{" "}
              <span style={{ color: DIM, textDecoration: "none" }}>
                theformulaperformance.com
              </span>
              . No payment has been taken.
            </Text>
            <Text
              style={{
                margin: 0,
                fontFamily: SANS,
                fontSize: "12px",
                lineHeight: 1.6,
                color: DIMMER,
              }}
            >
              &copy; 2026 {LEGAL_ENTITY} &nbsp;&middot;&nbsp;
              <Link
                href={unsubscribeUrl}
                style={{
                  color: DIM,
                  textDecoration: "none",
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                Leave the waitlist
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

WaitlistWelcomeEmail.PreviewProps = {
  firstName: "Ahmed",
  waitlistRef: "WL-48217",
  logoUrl: "https://theformulaperformance.com/email/logo.png",
  communityImageUrl: "https://theformulaperformance.com/email/community.jpg",
  instagramUrl: "https://instagram.com/kanem14",
  unsubscribeUrl:
    "mailto:info@theformulaperformance.com?subject=Leave%20the%20waitlist",
} satisfies WaitlistWelcomeEmailProps;

export default WaitlistWelcomeEmail;
