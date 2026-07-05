import { queue } from "@trigger.dev/sdk";

export const emailQueue = queue({
  name: "email",
  concurrencyLimit: 8,
});

export const ghlQueue = queue({
  name: "ghl",
  concurrencyLimit: 5,
});
