import { MotionProvider } from "@/components/brand/MotionProvider";
import { SpotlightGrid } from "@/components/brand/SpotlightGrid";
import { Toaster } from "@/components/ui/sonner";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionProvider>
      <SpotlightGrid />
      {children}
      <Toaster />
    </MotionProvider>
  );
}
