import { MotionProvider } from "@/components/brand/MotionProvider";
import { SpotlightGrid } from "@/components/brand/SpotlightGrid";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionProvider>
      <SpotlightGrid />
      {children}
    </MotionProvider>
  );
}
