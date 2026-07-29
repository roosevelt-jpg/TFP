import { MotionProvider } from "@/components/brand/MotionProvider";
import { Toaster } from "@/components/ui/sonner";

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionProvider>
      {children}
      <Toaster />
    </MotionProvider>
  );
}
