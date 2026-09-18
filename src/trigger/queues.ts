import { queue } from "@trigger.dev/sdk";

export const emailQueue = queue({
  name: "email",
  concurrencyLimit: 8,
});

// Each run loads a PDF into memory, so this is deliberately narrower than the
// others: a launch-day burst should queue rather than run out of memory.
export const pdfQueue = queue({
  name: "pdf",
  concurrencyLimit: 3,
});

export const ghlQueue = queue({
  name: "ghl",
  concurrencyLimit: 5,
});

export const whatsappQueue = queue({
  name: "whatsapp",
  concurrencyLimit: 4,
});
