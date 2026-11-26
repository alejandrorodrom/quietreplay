# Contributing

Thanks for helping improve **QuietReplay**.

[Español](./CONTRIBUTING.es.md)

## Development setup

```bash
git clone https://github.com/alejandrorodrom/quietreplay.git
cd quietreplay
pnpm install
pnpm run build
```

Requirements: Node.js `>= 22.12`, pnpm 9+.

Load the unpacked extension from `.output/chrome-mv3` (after `pnpm run build` or `pnpm run dev`).

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm run dev` | WXT dev server + reload |
| `pnpm run build` | Production build |
| `pnpm run zip` | Build Chrome extension ZIP |
| `pnpm run compile` | Typecheck |
| `pnpm run lint` | ESLint |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm run test:coverage` | Unit tests with coverage thresholds |
| `pnpm run test:e2e` | Classic Playwright e2e (required for capture-flow PRs) |
| `pnpm run test:e2e:external` | External / fragile e2e (informational in CI) |
| `pnpm run check:no-network` | Fail if extension bundles introduce network APIs |
| `pnpm run check:license-headers` | Ensure SPDX/copyright headers on source files |

CI runs lint, typecheck, build, unit tests (with coverage), no-network check,
CodeQL, and classic e2e. External e2e runs afterward as informational
(`continue-on-error`).

## Coding standards

- TypeScript strictness as configured in the repo; no new `any` without reason.
- Prefer small, focused modules under `lib/` for testable logic.
- Prefer native HTML form controls in popup/options; consult Modern Web Guidance for UI work.
- **Never** add remote network calls from extension code. Obfuscation stays opt-in via settings.
- Keep user-facing strings in `locales/en.ts` and `locales/es.ts`.

## Tests policy (mandatory for major changes)

- As **major new functionality** is added, add automated tests covering it
  (`tests/unit` and/or `tests/e2e` as appropriate).
- When fixing a bug, add a **regression test** when practical (aim for most fixes).
- Run `pnpm test` (and e2e if you touch capture flow) before opening a PR.
- Coverage gates are enforced in CI (`pnpm run test:coverage`). Current floor is
  Silver-oriented (≥80% statements / ≥65% branches on `lib/`); raise toward
  Gold (90% / 80%) as tests grow. See [docs/OPENSSF.md](./docs/OPENSSF.md).

## Code review

Reviews check:

1. Correctness and edge cases (tab lifecycle, permissions, save path).
2. No new network / telemetry / cloud endpoints.
3. Tests and docs (EN + ES) updated when behavior changes.
4. Changelog entries for user-visible releases.
5. Secrets and redaction behavior remain safe by default.

External contributors: open a pull request; maintainers approve before merge.
Issues labeled `good first issue` are intended for new or casual contributors.

## Pull requests

- Keep changes focused; follow the PR template.
- Update **both** `README.md` and `README.es.md` (and other `*.es.md` docs) when user-facing behavior changes.
- Update `CHANGELOG.md` and `CHANGELOG.es.md` for user-visible releases.
- Link related issues.

## Project docs

- [GOVERNANCE.md](./GOVERNANCE.md) — roles and decision making
- [ROADMAP.md](./ROADMAP.md) — near/medium-term intent
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — design overview
- [docs/SECURITY_ASSURANCE.md](./docs/SECURITY_ASSURANCE.md) — threat model

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
