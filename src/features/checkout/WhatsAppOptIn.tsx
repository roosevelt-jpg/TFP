import { CtaButton } from "@/components/brand/CtaButton";
import { GridBackdrop } from "@/components/brand/GridBackdrop";
import { qrPath } from "@/lib/qr";
import { COACH_WHATSAPP_URL } from "@/lib/whatsapp";

// The step that actually starts the coaching. WhatsApp and UK consent law mean
// the coach cannot message first, so a purchase alone leaves someone waiting.
export async function WhatsAppOptIn() {
  const qr = await qrPath(COACH_WHATSAPP_URL);

  return (
    <div className="border-red/35 relative overflow-hidden rounded-md border bg-bg p-[clamp(22px,4vw,34px)]">
      <GridBackdrop vignette="soft" />
      <div className="relative grid items-center gap-[clamp(20px,3vw,32px)] min-[820px]:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="mb-3.5 flex items-center gap-2.75">
            <span className="bg-red text-cta-contrast grid size-7.5 place-items-center rounded-full text-[0.92rem] font-bold">
              2
            </span>
            <span className="text-red-bright tracking-label text-[0.7rem] font-semibold uppercase">
              Last step
            </span>
          </div>
          <h2 className="text-h3 font-body font-semibold">
            Say hello to your coach
          </h2>
          <p className="text-muted mt-3 max-w-[46ch] leading-relaxed">
            Your coach can’t message you until you message them first. Once
            you’ve answered the questions above, tap here and send the message
            that appears, and your coaching starts straight away.
          </p>

          <div className="mt-6">
            <CtaButton
              href={COACH_WHATSAPP_URL}
              size="lg"
              withArrow={false}
              target="_blank"
              rel="noopener noreferrer"
            >
              Message My Coach on WhatsApp
            </CtaButton>
          </div>
        </div>

        {qr && (
          <div className="grid justify-items-center gap-2.5">
            <svg
              role="img"
              viewBox={`0 0 ${qr.size} ${qr.size}`}
              shapeRendering="crispEdges"
              className="text-text w-[clamp(132px,26vw,168px)]"
            >
              <title>QR code to message your coach on WhatsApp</title>
              <path d={qr.d} stroke="currentColor" />
            </svg>
            <p className="text-muted max-w-[24ch] text-center text-[0.8rem] leading-normal">
              On a computer? Scan this with your phone camera.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
