# The Formula Programme

Marketing and waitlist site for The Formula Programme — an 8-week fitness
programme by Kane Mousah.

## Stack

- **Next.js 16** (App Router, RSC) · **React 19** · **TypeScript**
- **Tailwind CSS v4** (design tokens → `@theme`)
- **Biome** (format + lint) · **knip** (dead-code)
- **pnpm** · **Node 22**

## Develop

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command          | Description                          |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Start the dev server                 |
| `pnpm build`     | Production build                     |
| `pnpm typecheck` | `tsc --noEmit`                       |
| `pnpm check`     | Biome format + lint                  |
| `pnpm check:fix` | Biome format + lint, write fixes     |
| `pnpm knip`      | Report unused files and dependencies |

## Status

Phase 1 — foundation. The marketing UI, waitlist backend, and production
hardening land in subsequent phases.
