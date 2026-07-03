import { BrandChat } from "@/components/brand/BrandChat";
import { Testimonial } from "@/components/brand/Testimonial";
import { signupRailChat } from "@/content/chat-scripts";
import { testimonials } from "@/content/testimonials";

import { WhatYouGetCard } from "./WhatYouGetCard";

export function WaitlistAside() {
  const featured = testimonials.find((t) => t.featured) ?? testimonials[0];

  return (
    <aside className="hidden grid-cols-1 content-start gap-4 min-[900px]:grid min-[900px]:sticky min-[900px]:top-6">
      <WhatYouGetCard />
      <BrandChat
        messages={signupRailChat("your number")}
        header={{
          name: "Kane · Your Coach",
          status: "connects when you start",
          online: false,
          avatar: "/assets/kane-headshot.png",
        }}
      />
      <Testimonial {...featured} />
    </aside>
  );
}
