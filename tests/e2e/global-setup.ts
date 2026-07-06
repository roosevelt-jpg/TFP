import { execSync } from "node:child_process";

export default function globalSetup(): void {
  execSync("pnpm exec tsx tests/e2e/seed.ts", { stdio: "inherit" });
}
