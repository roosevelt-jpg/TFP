"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

// CSS custom properties aren't part of React's CSSProperties, so widen the type
// instead of casting the object.
const toasterVars: React.CSSProperties & Record<`--${string}`, string> = {
  "--normal-bg": "var(--surface)",
  "--normal-text": "var(--text)",
  "--normal-border": "var(--hairline-strong)",
  "--border-radius": "var(--r-md)",
  "--error-bg": "var(--surface)",
  "--error-border": "var(--danger)",
};

export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-right"
      style={toasterVars}
      toastOptions={{
        classNames: {
          toast: "font-body",
          error: "border-l-2 border-l-danger",
        },
      }}
      {...props}
    />
  );
}
