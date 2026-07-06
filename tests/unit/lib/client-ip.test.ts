import { describe, expect, it, vi } from "vitest";

import { clientIp } from "@/lib/client-ip";

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn<() => Promise<Headers>>(),
}));

vi.mock("next/headers", () => ({ headers: headersMock }));

function withHeaders(init: Record<string, string>): void {
  headersMock.mockResolvedValue(new Headers(init));
}

// This value is the rate-limit key and consent evidence — precedence must
// favour the platform-attested headers Vercel controls.
describe("clientIp", () => {
  it("prefers x-real-ip over everything else", async () => {
    withHeaders({
      "x-real-ip": " 1.2.3.4 ",
      "x-vercel-forwarded-for": "5.6.7.8",
      "x-forwarded-for": "9.9.9.9",
    });

    await expect(clientIp()).resolves.toBe("1.2.3.4");
  });

  it("falls back to x-vercel-forwarded-for", async () => {
    withHeaders({
      "x-vercel-forwarded-for": "5.6.7.8",
      "x-forwarded-for": "9.9.9.9",
    });

    await expect(clientIp()).resolves.toBe("5.6.7.8");
  });

  it("takes only the first hop of x-forwarded-for", async () => {
    withHeaders({ "x-forwarded-for": "9.9.9.9, 10.0.0.1, 172.16.0.1" });

    await expect(clientIp()).resolves.toBe("9.9.9.9");
  });

  it("returns null when no header is present", async () => {
    withHeaders({});

    await expect(clientIp()).resolves.toBeNull();
  });
});
