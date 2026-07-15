"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { trackPixelPageView } from "@/lib/meta-pixel";

// The base snippet fires PageView once per hard load; App Router soft
// navigations need a manual fire per route change.
export function MetaPixelPageView() {
  const pathname = usePathname();
  const lastPathname = useRef(pathname);

  useEffect(() => {
    // Unchanged on mount: the hard-load PageView already came from init.
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    trackPixelPageView();
  }, [pathname]);

  return null;
}
