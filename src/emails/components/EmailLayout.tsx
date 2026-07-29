import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
} from "@react-email/components";

import { email } from "./theme";

type EmailLayoutProps = {
  preview: string;
  logoUrl: string;
  headerMeta: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function EmailLayout({
  preview,
  logoUrl,
  headerMeta,
  children,
  footer,
}: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="dark light" />
        <meta name="supported-color-schemes" content="dark light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, padding: 0, backgroundColor: email.bg }}>
        <Container
          style={{
            width: "600px",
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: email.card,
          }}
        >
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
                    fontFamily: email.sans,
                    fontSize: "12px",
                    color: email.dim,
                  }}
                >
                  {headerMeta}
                </td>
              </tr>
            </table>
          </Section>

          <Section style={{ padding: "0 34px" }}>
            <Hr
              style={{
                margin: 0,
                border: "none",
                borderTop: `1px solid ${email.hairline}`,
              }}
            />
          </Section>

          {children}

          <Section style={{ padding: "22px 34px 30px" }}>{footer}</Section>
        </Container>
      </Body>
    </Html>
  );
}
