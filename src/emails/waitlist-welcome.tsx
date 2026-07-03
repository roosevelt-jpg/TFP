import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type WaitlistWelcomeEmailProps = {
  firstName?: string;
  ref: string;
  appUrl: string;
};

const RED = "#d8231c";
const BG = "#0a0a0a";
const SURFACE = "#121110";
const HAIRLINE = "#211f1d";
const TEXT = "#f4f1ec";
const MUTED = "#9a938c";
const DIM = "#827c76";

export function WaitlistWelcomeEmail({
  firstName,
  ref,
  appUrl,
}: WaitlistWelcomeEmailProps) {
  const greeting = firstName
    ? `You're on the list, ${firstName}.`
    : "You're on the list.";

  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="dark" />
        <meta name="supported-color-schemes" content="dark" />
      </Head>
      <Preview>
        You're on The Formula Programme waitlist — here's what happens next.
      </Preview>
      <Body
        style={{
          backgroundColor: BG,
          color: TEXT,
          margin: 0,
          padding: "32px 0",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <Container
          style={{ maxWidth: "560px", margin: "0 auto", padding: "0 20px" }}
        >
          <Text
            style={{
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: TEXT,
              margin: "0 0 28px",
            }}
          >
            The Formula Programme
          </Text>

          <Section
            style={{
              backgroundColor: SURFACE,
              border: `1px solid ${HAIRLINE}`,
              borderTop: `2px solid ${RED}`,
              borderRadius: "4px",
              padding: "32px",
            }}
          >
            <Heading
              as="h1"
              style={{
                fontSize: "26px",
                fontWeight: 600,
                lineHeight: 1.15,
                color: TEXT,
                margin: "0 0 14px",
              }}
            >
              {greeting}
            </Heading>

            <Text
              style={{
                fontSize: "15px",
                lineHeight: 1.65,
                color: MUTED,
                margin: "0 0 20px",
              }}
            >
              You've secured your spot for the 8-week programme and your
              Performance Coach in WhatsApp. We'll email you the moment a place
              opens — and your coach will pick things up from there.
            </Text>

            <Text
              style={{
                fontSize: "13px",
                color: DIM,
                margin: "0 0 4px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Your reference
            </Text>
            <Text
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: TEXT,
                margin: "0 0 24px",
              }}
            >
              {ref}
            </Text>

            <Hr style={{ borderColor: HAIRLINE, margin: "0 0 24px" }} />

            <Text
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: TEXT,
                margin: "0 0 12px",
              }}
            >
              What happens next
            </Text>
            <Text
              style={{
                fontSize: "14px",
                lineHeight: 1.65,
                color: MUTED,
                margin: "0 0 8px",
              }}
            >
              1. We hold your place and email you the second it opens.
            </Text>
            <Text
              style={{
                fontSize: "14px",
                lineHeight: 1.65,
                color: MUTED,
                margin: "0 0 8px",
              }}
            >
              2. Your 8-week programme is yours to keep, delivered instantly.
            </Text>
            <Text
              style={{
                fontSize: "14px",
                lineHeight: 1.65,
                color: MUTED,
                margin: 0,
              }}
            >
              3. Your Performance Coach is ready on WhatsApp the same day.
            </Text>
          </Section>

          <Text
            style={{
              fontSize: "15px",
              fontStyle: "italic",
              color: MUTED,
              margin: "28px 0 0",
              textAlign: "center",
            }}
          >
            Talk soon. — Kane
          </Text>

          <Text
            style={{
              fontSize: "12px",
              color: DIM,
              margin: "24px 0 0",
              textAlign: "center",
            }}
          >
            The Formula Performance Elite Ltd ·{" "}
            {appUrl.replace(/^https?:\/\//, "")}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

WaitlistWelcomeEmail.PreviewProps = {
  firstName: "Kane",
  ref: "WL-7H2K9F4B",
  appUrl: "https://theformulaperformance.com",
} satisfies WaitlistWelcomeEmailProps;

export default WaitlistWelcomeEmail;
