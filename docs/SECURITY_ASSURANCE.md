# Security assurance case

[Español](./SECURITY_ASSURANCE.es.md)

This document argues why QuietReplay meets its security requirements. It is
the project assurance case for OpenSSF Best Practices (silver/gold).

## Security requirements (what users can expect)

QuietReplay **will**:

- Keep recordings on the local machine (Downloads / browser profile).
- Avoid QuietReplay-operated network endpoints for capture data (`connect-src 'none'`).
- Declare only the Chrome permissions needed for record/save/video.
- Offer optional redaction of common secret-looking patterns (off by default).

QuietReplay **will not** (by design):

- Create accounts or sync recordings to QuietReplay cloud services.
- Guarantee that a hostile page cannot observe the user’s own actions on that page.
- Guarantee redaction catches every secret (patterns are heuristic).

## Threat model

| Threat | Mitigation |
|--------|------------|
| Exfiltration of recording to attacker-controlled server via extension code | CSP `connect-src 'none'`; CI `check:no-network` on bundles; code review |
| Over-broad host access | `optional_host_permissions`; user grants per site when needed |
| Sensitive values in saved ZIP | Optional redact; user controls what they record and share |
| Supply-chain compromise of release ZIP | GitHub Actions build; artifact attestations (SLSA provenance); SBOM on release |
| Malicious contribution | PR review; branch rules; CODEOWNERS; Dependabot; CodeQL |

## Trust boundaries

See [ARCHITECTURE.md](./ARCHITECTURE.md#trust-boundaries). Data crossing the
page ↔ extension boundary is treated as untrusted input for selector/text
handling; output is a local file the user chooses to share.

## Secure design principles applied

| Principle | How |
|-----------|-----|
| Fail-safe defaults | No network from extension pages; redaction opt-in |
| Least privilege | Minimal MV3 permissions; optional hosts |
| Complete mediation | Capture only when armed for a tab; stop clears session |
| Economy of mechanism | Local ZIP pipeline without cloud control plane |
| Psychological acceptability | Clear UI states (Ready / Recording / Saving) |

## Common weakness classes countered

| Class (examples) | Counter |
|------------------|---------|
| CWE-319 / cleartext sensitive transmission | No QuietReplay network transmission of captures |
| CWE-200 / information exposure | Optional redact; local-only storage |
| CWE-829 / inclusion of untrusted control sphere | Pin Actions by SHA; lockfile; npm audit |
| Injection into extension pages | CSP; no remote script load |
| OWASP A07 Identification failures | No end-user auth in the product |

## Security review

A maintainer security review of requirements and boundaries was recorded for
this assurance case (2026). Re-review at least every five years or after major
architecture changes (new permissions, any network feature, new capture sinks).

## Verification

- Unit + e2e tests in CI
- `pnpm run check:no-network`
- CodeQL on push/PR
- OpenSSF Scorecard workflow
- Release attestations: `gh attestation verify --repo alejandrorodrom/quietreplay <zip>`
