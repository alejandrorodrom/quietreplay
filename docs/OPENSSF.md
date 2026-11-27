# OpenSSF posture (Scorecard, Best Practices, SLSA)

[Español](./OPENSSF.es.md)

QuietReplay aims for a strong OpenSSF Scorecard score, an OpenSSF Best
Practices badge (Passing → Silver; Gold when a second reviewer joins), and
SLSA build provenance on GitHub Release ZIPs.

## Current Scorecard snapshot

Public results: https://scorecard.dev/viewer/?uri=github.com/alejandrorodrom/quietreplay  
API: https://api.scorecard.dev/projects/github.com/alejandrorodrom/quietreplay

| Check | Typical | Notes |
|-------|---------|--------|
| Security-Policy, Dangerous-Workflow, Binary-Artifacts, Dependency-Update-Tool, Token-Permissions, Pinned-Dependencies, Vulnerabilities, License, Fuzzing, CI-Tests | 10 | Already automated |
| SAST | ~9 | CodeQL on push/PR; rises as more commits go through it |
| CII-Best-Practices | 5 | Passing badge; Silver/Gold need more criteria + second maintainer |
| Contributors | 3 | Needs contributors from ≥2 orgs |
| Code-Review | 0 | Needs human approvals on recent changesets |
| Maintained | 0 | Automatic until the repo is >90 days old with activity |
| Branch-Protection | −1 / error | Apply ruleset (below); avoid classic BP without `SCORECARD_TOKEN` |
| Signed-Releases | −1 | No GitHub Releases yet — run `publish.yml` once |
| Packaging | −1 | Expected: Scorecard only detects npm/pypi/docker/etc. hubs, not Chrome Web Store / GitHub Release ZIPs |

`-1` checks are inconclusive and **do not** enter the average. Turning Signed-Releases and Branch-Protection into high scores raises the overall number.

## Already automated in this repo

| Control | Where |
|---------|--------|
| OpenSSF Scorecard workflow | `.github/workflows/scorecard.yml` |
| CodeQL SAST | `.github/workflows/codeql.yml` |
| SBOM + attestations on release | `.github/workflows/publish.yml` |
| Coverage + license headers in CI | `.github/workflows/ci.yml` |
| Security / governance docs | `SECURITY.md`, `GOVERNANCE.md`, `docs/SECURITY_ASSURANCE.md` |
| Branch ruleset helper | `scripts/configure-github-protection.sh` |

## Scorecard badge

After the Scorecard workflow runs on `main` with `publish_results: true`:

```markdown
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/alejandrorodrom/quietreplay/badge)](https://scorecard.dev/viewer/?uri=github.com/alejandrorodrom/quietreplay)
```

Viewer: https://scorecard.dev/viewer/?uri=github.com/alejandrorodrom/quietreplay

## Remediation playbook (highest impact first)

### 1. Branch protection (ruleset)

```bash
gh auth login -h github.com
./scripts/configure-github-protection.sh
gh workflow run "Scorecard supply-chain security"
```

Default: admin bypass ON so a solo maintainer can still merge. When a second
reviewer has Write access, re-run with `STRICT_ADMIN=1` for a higher
Branch-Protection score.

Optional: add secret `SCORECARD_TOKEN` (fine-grained PAT,
Administration: Read) only if you keep **classic** branch protection. Prefer
rulesets so the public scanner does not need that token.

### 2. First signed release (Signed-Releases → 10)

`publish.yml` already attaches `*.sigstore.json` and `*.intoto.jsonl`.

```bash
gh workflow run "Publish extension release" -f dry_run=false
```

Verify:

```bash
gh attestation verify --repo alejandrorodrom/quietreplay ./quietreplay-*.zip
```

### 3. Code-Review

Merge via PRs with a **human** approval (bots do not count). Invite at least
one Write collaborator; keep `CODEOWNERS` pointing at reviewers.

### 4. Packaging

Leave as inconclusive. QuietReplay is distributed via Chrome Web Store / Edge
Add-ons and signed GitHub Release ZIPs — Scorecard’s Packaging probe does not
recognize that path. Do **not** add a dummy `npm publish` only to game the
check.

### 5. Maintained / Contributors / Best Practices Gold

- Maintained: keep committing; score recovers after 90 days from creation.
- Contributors: welcome external org contributors.
- Best Practices Silver/Gold: continue https://www.bestpractices.dev/projects/17177

## Best Practices badge (manual)

1. Sign in at https://www.bestpractices.dev with GitHub.
2. Project: `https://github.com/alejandrorodrom/quietreplay` (metal series, id `17177`).
3. Complete **Passing**, then **Silver** using the docs in this repository.
4. Leave Gold criteria that need a second maintainer unmet until a Write
   collaborator can review PRs.
5. Badge markdown is already in `README.md` / `README.es.md`.

## Verify SLSA provenance

After a non-dry-run publish:

```bash
gh attestation verify --repo alejandrorodrom/quietreplay ./quietreplay-*.zip
```

Release assets also include `*.spdx.json`, `*.sigstore.json`, and `*.intoto.jsonl`
for Scorecard **Signed-Releases** / **SBOM** checks.
