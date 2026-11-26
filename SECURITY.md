# Security Policy

[Español](./SECURITY.es.md)

## Supported versions

Security fixes are applied to the **latest published** QuietReplay release.
Older releases are not patched; please upgrade.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Prefer one of:

1. [GitHub Security Advisories](https://github.com/alejandrorodrom/quietreplay/security/advisories/new) (private report) — preferred, or
2. Contact the maintainer via [GitHub profile](https://github.com/alejandrorodrom) if advisories are unavailable.

Include:

- Affected extension version
- Steps to reproduce
- Impact assessment (if known)

### Response and disclosure timelines

- You should receive an **acknowledgement within 14 days** of a complete report.
- We aim to publish a fix or mitigation for confirmed medium-or-higher issues
  within **90 days** of acknowledgement, or to agree a coordinated disclosure
  date if more time is needed.
- Please do **not** disclose publicly until a fix is available or 90 days have
  passed after acknowledgement (whichever comes first), unless we agree otherwise.

Assurance case and threat model: [docs/SECURITY_ASSURANCE.md](./docs/SECURITY_ASSURANCE.md).

## Scope

QuietReplay is a **local-only** Chrome extension. It does not send captured data
to any QuietReplay server. Obfuscation/redaction is optional (off by default).
Report issues that could leak secrets when obfuscation is enabled, bypass
`connect-src 'none'`, or escalate privileges beyond declared permissions.

## Verifying release artifacts

GitHub Releases may include SLSA build provenance attestations. After
downloading a ZIP:

```bash
gh attestation verify --repo alejandrorodrom/quietreplay ./quietreplay-*.zip
```
