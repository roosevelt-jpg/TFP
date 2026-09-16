import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";

import { db } from "@/db";
import { env } from "@/env";

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.NEXT_PUBLIC_APP_URL,
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    // Invite-only: public sign-up stays off. Seed / admin scripts create users.
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "viewer",
        input: false,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  plugins: [
    twoFactor({
      issuer: "TFP Command",
      totpOptions: { period: 30 },
    }),
  ],
  advanced: {
    database: {
      joins: true,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
