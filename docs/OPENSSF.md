# OpenSSF posture (Scorecard, Best Practices, SLSA)

[Español](./OPENSSF.es.md)

QuietReplay aims for a strong OpenSSF Scorecard score, an OpenSSF Best
Practices badge (Passing → Silver; Gold when a second reviewer joins), and
SLSA build provenance on GitHub Release ZIPs.

## Already automated in this repo

| Control | Where |
|---------|--------|
| OpenSSF Scorecard workflow | `.github/workflows/scorecard.yml` |
| CodeQL SAST | `.github/workflows/codeql.yml` |
| SBOM + attestations on release | `.github/workflows/publish.yml` |
| Coverage + license headers in CI | `.github/workflows/ci.yml` |
| Security / governance docs | `SECURITY.md`, `GOVERNANCE.md`, `docs/SECURITY_ASSURANCE.md` |

## Scorecard badge

After the Scorecard workflow runs on `main` with `publish_results: true`:

```markdown
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/alejandrorodrom/quietreplay/badge)](https://scorecard.dev/viewer/?uri=github.com/alejandrorodrom/quietreplay)
```

Viewer: https://scorecard.dev/viewer/?uri=github.com/alejandrorodrom/quietreplay

## Best Practices badge (manual)

1. Sign in at https://www.bestpractices.dev with GitHub.
2. Add project `https://github.com/alejandrorodrom/quietreplay` (metal series).
3. Complete **Passing**, then **Silver** using the docs in this repository.
4. Leave Gold criteria that need a second maintainer unmet until a Write
   collaborator can review PRs.
5. Put the badge markdown (with your project ID) in `README.md` / `README.es.md`.

## Verify SLSA provenance

After a non-dry-run publish:

```bash
gh attestation verify --repo alejandrorodrom/quietreplay ./quietreplay-*.zip
```

Release assets also include `*.spdx.json`, `*.sigstore.json`, and `*.intoto.jsonl`
for Scorecard **Signed-Releases** / **SBOM** checks.

## Branch protection (solo admin)

`main` requires 1 approving review + CODEOWNERS + status checks (CI, E2E,
npm-audit, CodeQL). Admins are **not** enforced (`enforce_admins: false`) so
the owner is not blocked. Raise required approvals to **2** after inviting a
second reviewer.
