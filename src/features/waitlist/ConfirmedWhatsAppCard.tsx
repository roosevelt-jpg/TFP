import { Mail } from "lucide-react";

import { BrandChat } from "@/components/brand/BrandChat";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { waitlistChat } from "@/content/chat-scripts";

export function ConfirmedWhatsAppCard() {
  return (
    <div className="border-red/35 relative overflow-hidden rounded-md border bg-bg p-[clamp(22px,4vw,34px)]">
      <GridBackdrop vignette="soft" />
      <div className="relative grid items-center gap-[clamp(20px,3vw,32px)] min-[820px]:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-3.5 flex items-center gap-[11px]">
            <span className="bg-red text-cta-contrast grid size-[30px] place-items-center rounded-full text-[0.92rem] font-bold">
              1
            </span>
            <span className="text-red-bright tracking-label text-[0.7rem] font-semibold uppercase">
              Confirmed
            </span>
          </div>
          <h2 className="text-[clamp(1.5rem,3.4vw,2rem)]">
            Your spot is reserved
          </h2>
          <p className="text-muted mt-3 max-w-[42ch] leading-relaxed">
            You’re on the early-access list. The moment a place opens we’ll
            email you to claim your spot — then your Performance Coach goes live
            on WhatsApp at the number you gave us.
          </p>
          <div className="text-muted border-hairline-strong mt-5 inline-flex items-center gap-[9px] rounded-sm border px-4 py-3 text-[0.88rem]">
            <Mail size={15} strokeWidth={2} aria-hidden />
            We’ll reach you by email &amp; WhatsApp
          </div>
        </div>
        <BrandChat
          messages={waitlistChat}
          decorative
          header={{
            name: "Kane · Your Coach",
            status: "connects when you start",
            online: false,
            avatar: "/assets/kane-headshot.png",
          }}
        />
      </div>
    </div>
  );
}
