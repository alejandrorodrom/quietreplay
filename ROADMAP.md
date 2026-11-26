# Roadmap

[Español](./ROADMAP.es.md)

This roadmap describes what QuietReplay intends to do — and not do — over
roughly the next year. Dates are directional, not commitments.

## Near term

- Keep the extension **local-only** (no accounts, no remote telemetry).
- Improve OpenSSF posture: Scorecard, Best Practices (Passing → Silver),
  SLSA provenance on GitHub Releases, SBOM artifacts.
- Harden CI: CodeQL, coverage gates, Dependabot, npm audit.
- Polish capture reliability (reload survivability, video optional path).
- Keep bilingual docs (EN/ES) in sync for user-facing changes.

## Medium term

- Viewer UX improvements for large HAR/replay packages.
- Better redaction patterns and safer defaults documentation.
- Optional publish helpers for Chrome Web Store / Edge (manual or gated CI),
  without changing the local-only runtime model.
- Recruit a second reviewer/collaborator to raise bus factor and enable
  two-person review for Best Practices Gold.

## Explicitly out of scope (for now)

- Cloud sync, accounts, or uploading recordings to QuietReplay servers.
- Recording Chrome Web Store / `chrome://` pages (platform limitation).
- Becoming a general-purpose session replay SaaS.

## How to influence the roadmap

Open a feature request issue or pull request. Security-sensitive ideas belong
in private advisories (see [SECURITY.md](./SECURITY.md)).
