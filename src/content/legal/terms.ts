import {
  COMPANY_NUMBER,
  CONTACT_EMAIL,
  LEGAL_ENTITY,
  REGISTERED_OFFICE,
} from "@/lib/legal";
import { PRICE_MONTHLY, PRICE_TODAY } from "@/lib/pricing";

import type { LegalDoc } from "./types";

export const terms: LegalDoc = {
  title: "Terms of Service",
  updated: "3 July 2026",
  sections: [
    {
      heading: "1 · Who we are",
      blocks: [
        {
          type: "p",
          content: [
            "The Formula Programme is operated by ",
            { b: LEGAL_ENTITY },
            ` (company number ${COMPANY_NUMBER}), a company registered in England and Wales with its registered office at ${REGISTERED_OFFICE} (“we”, “us”, “our”). These Terms of Service (“Terms”) govern your access to and use of our website, the 8-week programme, and the Performance Coach service (together, the “Services”). By joining the waitlist, creating an account, or purchasing, you agree to these Terms.`,
          ],
        },
      ],
    },
    {
      heading: "2 · Eligibility",
      blocks: [
        {
          type: "p",
          content: [
            "You must be at least ",
            { b: "16 years old" },
            " to use the Services. If you are under 18, you may only use them with the involvement and consent of a parent or guardian, who must agree to these Terms and take responsibility for any purchase on your behalf. The Services are for personal, non-commercial use. If you use them for someone else, you confirm you are authorised to accept these Terms for them.",
          ],
        },
      ],
    },
    {
      heading: "3 · What you’re buying",
      blocks: [
        {
          type: "p",
          content: [
            "Your purchase gives you the full 8-week programme — a structured training and nutrition plan delivered digitally, which is ",
            { b: "yours to keep" },
            " — and access to your Performance Coach for 8 weeks. The Services are digital; there is no physical product and nothing is shipped. We may update or improve the programme content over time.",
          ],
        },
      ],
    },
    {
      heading: "4 · Your Performance Coach",
      blocks: [
        {
          type: "p",
          content: [
            "The Performance Coach is an ",
            { b: "AI-powered service" },
            " that supports you over WhatsApp, trained on Kane Mousah’s coaching style and principles. It is ",
            { b: "not a live person" },
            " and is not a substitute for professional advice. It can make mistakes, and its responses are for general fitness and educational guidance only. It does not provide medical, psychological, or nutritional advice tailored to a diagnosed condition. Always use your own judgement and consult a qualified professional where appropriate.",
          ],
        },
      ],
    },
    {
      heading: "5 · Pricing & payment",
      blocks: [
        {
          type: "p",
          content: [
            "The programme and your first 8 weeks with the Performance Coach cost ",
            { b: `£${PRICE_TODAY} today` },
            ". To keep your coach beyond the first 8 weeks, membership then continues at ",
            { b: `£${PRICE_MONTHLY} per month` },
            " until cancelled (see “Cancellation”). Prices are in GBP and include any applicable taxes unless stated otherwise. Payments are processed securely by ",
            { b: "Stripe" },
            "; we do not store your full card details. If a payment fails, we may retry it or suspend access until it is resolved.",
          ],
        },
      ],
    },
    {
      heading: "6 · Renewing membership",
      blocks: [
        {
          type: "p",
          content: [
            "Monthly coaching is a recurring subscription. By continuing past your first 8 weeks you authorise us, through Stripe, to charge the then-current monthly fee to your payment method at the start of each billing period until you cancel. Payment processing is scheduled in advance, so a charge already in progress may not be stoppable — if it goes through, it covers your final month and your coach stays active until that period ends.",
          ],
        },
      ],
    },
    {
      heading: "7 · Cancellation",
      blocks: [
        {
          type: "p",
          content: [
            "You can cancel your monthly coaching membership ",
            { b: "at any time" },
            " — from your account or by messaging the team. Cancelling stops future charges; you keep the 8-week programme files either way. We don’t use phone calls or retention hoops. Cancellation takes effect at the end of the current paid period.",
          ],
        },
      ],
    },
    {
      heading: "8 · Refunds",
      blocks: [
        {
          type: "p",
          content: [
            "We offer a ",
            { b: "14-day money-back guarantee" },
            " on your initial purchase. If the programme isn’t right for you, email us within 14 days of buying and we’ll refund it in full. Monthly renewals are not refundable, but you can cancel at any time to prevent the next charge. This guarantee is in addition to any rights you have under consumer law.",
          ],
        },
      ],
    },
    {
      heading: "9 · Health & safety disclaimer",
      blocks: [
        {
          type: "p",
          content: [
            "Our content is provided for general fitness and educational purposes and is ",
            { b: "not medical advice" },
            ". Exercise and dietary change carry inherent risks. Consult a qualified healthcare professional before starting any training or nutrition programme, particularly if you are pregnant, have an injury, or have a medical condition. Stop and seek help if you feel unwell. ",
            { b: "You take part at your own risk" },
            " and are responsible for training within your own limits.",
          ],
        },
      ],
    },
    {
      heading: "10 · Messaging & WhatsApp",
      blocks: [
        {
          type: "p",
          content: [
            "The Performance Coach is delivered over WhatsApp using the number you provide. By giving us your number you consent to receive coaching and service messages there. Standard message and data rates from your carrier may apply. You can change your number by contacting the team, and you can stop messages at any time by cancelling, replying to opt out, or blocking the number in WhatsApp. Your use of WhatsApp is also subject to WhatsApp’s own terms.",
          ],
        },
      ],
    },
    {
      heading: "11 · Acceptable use",
      blocks: [
        {
          type: "p",
          content: [
            "The programme and coaching are licensed to you for personal use only. You agree not to:",
          ],
        },
        {
          type: "ul",
          items: [
            [
              "resell, share, copy, or redistribute the programme or coaching materials;",
            ],
            [
              "use the Services for any unlawful purpose or in breach of these Terms;",
            ],
            [
              "attempt to reverse-engineer, scrape, or disrupt the Services or their underlying systems;",
            ],
            [
              "misuse the Performance Coach or behave abusively toward the service or our team.",
            ],
          ],
        },
        {
          type: "p",
          content: [
            "We may suspend or end your access to the coaching service if you break these rules. If we do, you still keep the 8-week programme files you’ve already received; we’ll refund any unused pre-paid coaching only where the law requires it.",
          ],
        },
      ],
    },
    {
      heading: "12 · Intellectual property",
      blocks: [
        {
          type: "p",
          content: [
            "All content in the programme and the Services — text, plans, media, branding, and software — is owned by us or our licensors and is protected by intellectual-property laws. We grant you a limited, personal, non-transferable, non-exclusive licence to access and use it for your own training. No other rights are granted.",
          ],
        },
      ],
    },
    {
      heading: "13 · Third-party services",
      blocks: [
        {
          type: "p",
          content: [
            "We rely on trusted third parties to run the Services, including ",
            { b: "Stripe" },
            " (payments), ",
            { b: "WhatsApp / Meta" },
            " (messaging), an email provider, and an AI provider that powers the Performance Coach. Your use of those features may also be subject to the relevant third party’s terms. We are not responsible for third-party services outside our control.",
          ],
        },
      ],
    },
    {
      heading: "14 · Disclaimers",
      blocks: [
        {
          type: "p",
          content: [
            "The Services are provided on an “as is” and “as available” basis. To the fullest extent permitted by law, we make no warranties that the Services will be uninterrupted, error-free, or will achieve any particular result. Fitness outcomes depend on many factors, including your own effort and circumstances, and are not guaranteed.",
          ],
        },
      ],
    },
    {
      heading: "15 · Limitation of liability",
      blocks: [
        {
          type: "p",
          content: [
            "Nothing in these Terms limits liability that cannot be limited by law — including liability for death or personal injury caused by our negligence, or for fraud. Subject to that, we are not liable for any indirect or consequential loss, and our total liability arising out of or in connection with the Services will not exceed the amount you paid us in the 12 months before the claim.",
          ],
        },
      ],
    },
    {
      heading: "16 · Changes to these Terms",
      blocks: [
        {
          type: "p",
          content: [
            "We may update these Terms from time to time. If we make material changes, we’ll let you know by email or in-app. Changes take effect when posted, and continuing to use the Services after that means you accept the updated Terms.",
          ],
        },
      ],
    },
    {
      heading: "17 · Governing law",
      blocks: [
        {
          type: "p",
          content: [
            "These Terms and any dispute arising from them are governed by the laws of ",
            { b: "England and Wales" },
            ", and the courts of England and Wales have exclusive jurisdiction, subject to any mandatory consumer-protection rights you have in your country of residence.",
          ],
        },
      ],
    },
    {
      heading: "18 · Contact",
      blocks: [
        {
          type: "p",
          content: [
            "Questions about these Terms? Email us at ",
            { link: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
            ". See also our ",
            { link: "Privacy Policy", href: "/privacy" },
            ".",
          ],
        },
      ],
    },
  ],
};
