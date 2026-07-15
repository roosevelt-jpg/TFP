import {
  COMPANY_NUMBER,
  CONTACT_EMAIL,
  LEGAL_ENTITY,
  REGISTERED_OFFICE,
} from "@/lib/legal";

import type { LegalDoc } from "./types";

export const privacy: LegalDoc = {
  title: "Privacy Policy",
  updated: "15 July 2026",
  sections: [
    {
      heading: "1 · Who we are",
      blocks: [
        {
          type: "p",
          content: [
            "The Formula Programme is operated by ",
            { b: LEGAL_ENTITY },
            ` (company number ${COMPANY_NUMBER}), registered at ${REGISTERED_OFFICE}. We are the “data controller” for the personal information described here, and you can reach us about any data request at the address below or by email. This policy explains what we collect, why, and the rights you have under UK and EU data-protection law (the UK GDPR and, where it applies, the EU GDPR).`,
          ],
        },
      ],
    },
    {
      heading: "2 · What we collect",
      blocks: [
        {
          type: "p",
          content: ["Depending on how you use the Services, we collect:"],
        },
        {
          type: "ul",
          items: [
            [
              { b: "Details you give us" },
              ": your name, email, and WhatsApp number when you join the waitlist or sign up, and optionally your training goal, experience level, and similar profile details.",
            ],
            [
              { b: "Payment information" },
              ": handled directly by Stripe. We receive confirmation of payment and limited details (such as the last four digits and card type); we never see or store your full card number.",
            ],
            [
              { b: "Coaching messages" },
              ": the messages you exchange with your Performance Coach on WhatsApp, so it can respond and support you.",
            ],
            [
              { b: "Support messages" },
              ": anything you send us when you contact the team.",
            ],
            [
              { b: "Usage data" },
              ": with your consent, information about how you use the site (such as pages viewed and how you interact with them) collected through cookies and similar technologies.",
            ],
            [
              { b: "Error and performance data" },
              ": basic technical information (such as device, browser, and the page involved) when something breaks or runs slowly, collected without cookies to keep the site working (our legitimate interests).",
            ],
          ],
        },
      ],
    },
    {
      heading: "3 · How we use it & our legal bases",
      blocks: [
        {
          type: "p",
          content: ["We use your information to:"],
        },
        {
          type: "ul",
          items: [
            [
              "deliver the 8-week programme and send your receipt and account emails ",
              { b: "(to perform our contract with you)" },
              ";",
            ],
            [
              "run your Performance Coach on WhatsApp: check-ins, answers, and accountability ",
              { b: "(to perform our contract)" },
              ";",
            ],
            [
              "take payments and manage your membership via Stripe ",
              { b: "(to perform our contract)" },
              ";",
            ],
            [
              "keep the Services secure, prevent fraud, and improve how they work ",
              { b: "(our legitimate interests)" },
              ";",
            ],
            [
              "send you updates about the waitlist or product where you’ve asked us to ",
              { b: "(your consent)" },
              ", which you can withdraw at any time;",
            ],
            [
              "understand how the site is used and measure our advertising ",
              { b: "(your consent)" },
              ", which you can withdraw at any time via the cookie choice on this page.",
            ],
          ],
        },
      ],
    },
    {
      heading: "4 · Your WhatsApp number & coaching messages",
      blocks: [
        {
          type: "p",
          content: [
            "Your WhatsApp number is used solely to message you as your coach. Your conversations are processed (including by our AI provider) to generate helpful, personalised responses, and are not used to build advertising profiles or sold to anyone. You can change your number by contacting the team, and stop messages at any time by cancelling, replying to opt out, or blocking the number in WhatsApp. Messaging is delivered through WhatsApp / Meta and is also governed by their privacy terms.",
          ],
        },
      ],
    },
    {
      heading: "5 · Who we share it with",
      blocks: [
        {
          type: "p",
          content: [
            "We use trusted processors to run the Services, and share only what each needs to do its job:",
          ],
        },
        {
          type: "ul",
          items: [
            [
              { b: "Stripe" },
              ": to process payments and manage subscriptions.",
            ],
            [{ b: "WhatsApp / Meta" }, ": to deliver coaching messages."],
            [
              { b: "Our email provider" },
              ": to send service and account emails.",
            ],
            [
              { b: "Our AI provider" },
              ": to power the Performance Coach’s responses.",
            ],
            [
              { b: "Sentry" },
              ": to detect and fix errors and performance problems. Sets no cookies, and data is limited to what diagnosis needs.",
            ],
            [
              { b: "PostHog" },
              ": to analyse how the site is used, including session recordings, only if you accept analytics cookies. Data is hosted in the EU and form entries are masked in recordings.",
            ],
            [
              { b: "Meta" },
              ": to measure how well our advertising works, only if you accept cookies. Meta may link this to your Facebook or Instagram account under its own privacy policy.",
            ],
          ],
        },
        {
          type: "p",
          content: [
            "We may also disclose information where required by law, or in connection with a business sale or reorganisation. ",
            { b: "We do not sell your personal data." },
          ],
        },
      ],
    },
    {
      heading: "6 · International transfers",
      blocks: [
        {
          type: "p",
          content: [
            "Some of our processors are based outside the UK or EEA. Where your information is transferred abroad, we rely on appropriate safeguards, such as the UK’s international data transfer agreement or the European Commission’s Standard Contractual Clauses, to keep it protected to the same standard.",
          ],
        },
      ],
    },
    {
      heading: "7 · How long we keep it",
      blocks: [
        {
          type: "p",
          content: [
            "We keep your information for as long as your account is active and as needed to provide the Services, then for any period we’re required to keep it by law (for example, tax and accounting records). You can ask us to delete your data at any time, subject to those legal obligations.",
          ],
        },
      ],
    },
    {
      heading: "8 · Your rights",
      blocks: [
        {
          type: "p",
          content: [
            "Under the UK GDPR (and the EU GDPR where it applies) you can ask us to:",
          ],
        },
        {
          type: "ul",
          items: [
            ["access a copy of the personal data we hold about you;"],
            ["correct information that’s inaccurate or incomplete;"],
            ["delete your data, or restrict or object to how we use it;"],
            ["receive your data in a portable format;"],
            ["withdraw consent where we rely on it."],
          ],
        },
        {
          type: "p",
          content: [
            "To exercise any of these, email us and we’ll respond within the timeframes the law requires. You also have the right to complain to the UK’s Information Commissioner’s Office (ICO) at ",
            { link: "ico.org.uk", href: "https://ico.org.uk" },
            ", or your local data-protection authority.",
          ],
        },
      ],
    },
    {
      heading: "9 · Cookies",
      blocks: [
        {
          type: "p",
          content: ["We use three kinds of cookies and similar technologies:"],
        },
        {
          type: "ul",
          items: [
            [
              { b: "Essential" },
              ": needed for the site to work, including remembering the cookie choice you make in our banner. These are always on.",
            ],
            [
              { b: "Analytics" },
              ": set only if you accept, to understand how the site is used and improve it (provided by PostHog, including session recordings with form entries masked).",
            ],
            [
              { b: "Advertising" },
              ": set only if you accept, to measure how well our ads work (provided by Meta).",
            ],
          ],
        },
        {
          type: "p",
          content: [
            "Nothing beyond essential cookies is set until you choose in the banner, and you can change your choice at any time using the control at the bottom of this page or by clearing cookies in your browser.",
          ],
        },
      ],
    },
    {
      heading: "10 · Age & children",
      blocks: [
        {
          type: "p",
          content: [
            "The Services are for people aged ",
            { b: "16 and over" },
            ", and we do not knowingly collect personal information from anyone under 16. If you believe someone under 16 has given us their data, contact us and we’ll delete it.",
          ],
        },
      ],
    },
    {
      heading: "11 · Changes to this policy",
      blocks: [
        {
          type: "p",
          content: [
            "We may update this policy from time to time. If we make material changes, we’ll let you know by email or in-app, and we’ll always show the “last updated” date above.",
          ],
        },
      ],
    },
    {
      heading: "12 · Contact",
      blocks: [
        {
          type: "p",
          content: [
            "For any privacy request or question, email us at ",
            { link: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
            ". See also our ",
            { link: "Terms of Service", href: "/terms" },
            ".",
          ],
        },
      ],
    },
  ],
};
