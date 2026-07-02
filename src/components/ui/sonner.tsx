"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-right"
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--text)",
          "--normal-border": "var(--hairline-strong)",
          "--border-radius": "var(--r-md)",
          "--error-bg": "var(--surface)",
          "--error-border": "var(--red)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "font-body",
          error: "border-l-2 border-l-red",
        },
      }}
      {...props}
    />
  );
}
