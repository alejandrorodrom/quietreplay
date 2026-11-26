# Security Policy

## Supported versions

Security fixes are applied to the latest published QuietReplay release.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Prefer one of:

1. [GitHub Security Advisories](https://github.com/alejandrorodrom/quietreplay/security/advisories/new) (private report), or
2. Contact the maintainer via [GitHub profile](https://github.com/alejandrorodrom) if advisories are unavailable.

Include:

- Affected extension version
- Steps to reproduce
- Impact assessment (if known)

You should receive an acknowledgement when possible. Please give reasonable time for a fix before public disclosure.

## Scope

QuietReplay is a **local-only** Chrome extension. It does not send captured data to any server. Obfuscation/redaction is optional (off by default). Report issues that could leak secrets when obfuscation is enabled, bypass `connect-src 'none'`, or escalate privileges beyond declared permissions.
