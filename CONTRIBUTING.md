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
| `pnpm run test:e2e` | Classic Playwright e2e (required for capture-flow PRs) |
| `pnpm run test:e2e:external` | External / fragile e2e (informational in CI) |
| `pnpm run check:no-network` | Fail if extension bundles introduce network APIs |

CI runs unit tests, no-network check, and classic e2e as required checks. External e2e runs afterward as informational (`continue-on-error`).

## Pull requests

- Keep changes focused; follow the PR template.
- Update **both** `README.md` and `README.es.md` (and other `*.es.md` docs) when user-facing behavior changes.
- Update `CHANGELOG.md` and `CHANGELOG.es.md` for user-visible releases.
- Never add remote network calls from extension code. Obfuscation stays opt-in via settings.
- Prefer native HTML form controls in popup/options; consult Modern Web Guidance for UI work.

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
