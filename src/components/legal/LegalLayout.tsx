import Link from "next/link";

import { Eyebrow } from "@/components/brand/Eyebrow";
import { Container } from "@/components/layout/Container";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipLink } from "@/components/layout/SkipLink";
import type { Block, Inline, LegalDoc } from "@/content/legal/types";

const FOOTER_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Home", href: "/" },
];

function textOf(nodes: Inline[]) {
  return nodes
    .map((n) => (typeof n === "string" ? n : "b" in n ? n.b : n.link))
    .join("");
}

function renderInline(nodes: Inline[]) {
  return nodes.map((node) => {
    if (typeof node === "string") return node;
    if ("b" in node) {
      return (
        <b key={node.b} className="text-text font-semibold">
          {node.b}
        </b>
      );
    }
    const external = node.href.startsWith("http");
    return (
      <Link
        key={node.href}
        href={node.href}
        className="text-text underline"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {node.link}
      </Link>
    );
  });
}

function renderBlock(block: Block) {
  if (block.type === "ul") {
    return (
      <ul
        key={textOf(block.items[0])}
        className="text-muted mb-3 list-disc space-y-1.5 pl-[18px] wrap-anywhere"
      >
        {block.items.map((item) => (
          <li key={textOf(item)}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }
  return (
    <p
      key={textOf(block.content)}
      className="text-muted mb-3 wrap-anywhere last:mb-0"
    >
      {renderInline(block.content)}
    </p>
  );
}

export function LegalLayout({
  doc,
  footer,
}: {
  doc: LegalDoc;
  // Rendered with the same section chrome as doc sections so interactive
  // extras (e.g. the cookie-choice control) can't drift from the doc style.
  footer?: { heading: string; body: React.ReactNode };
}) {
  return (
    <>
      <SkipLink />
      <SiteHeader variant="minimal" logoPriority />

      <main
        id="main"
        className="relative z-10 flex-1 py-[clamp(40px,7vw,72px)]"
      >
        <Container>
          <Eyebrow>Legal</Eyebrow>
          <h1 className="mt-4 text-[clamp(2.1rem,6vw,3.1rem)]">{doc.title}</h1>
          <p className="text-dim mt-3.5 text-[0.85rem]">
            Last updated {doc.updated}
          </p>

          <div className="mt-[18px] leading-[1.65]">
            {doc.sections.map((section) => (
              <section
                key={section.heading}
                className="border-hairline border-t py-6"
              >
                <h2 className="font-body text-text mb-2.5 text-[1.04rem] font-semibold tracking-normal">
                  {section.heading}
                </h2>
                {section.blocks.map(renderBlock)}
              </section>
            ))}
            {footer && (
              <section className="border-hairline border-t py-6">
                <h2 className="font-body text-text mb-2.5 text-[1.04rem] font-semibold tracking-normal">
                  {footer.heading}
                </h2>
                {footer.body}
              </section>
            )}
          </div>
        </Container>
      </main>

      <SiteFooter links={FOOTER_LINKS} minimal />
    </>
  );
}
