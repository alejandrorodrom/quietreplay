# Postura OpenSSF (Scorecard, Best Practices, SLSA)

[English](./OPENSSF.md)

QuietReplay apunta a un Scorecard alto, badge OpenSSF Best Practices
(Passing → Silver; Gold cuando haya un segundo reviewer) y provenance SLSA
en los ZIP de GitHub Releases.

## Ya automatizado en este repo

| Control | Dónde |
|---------|--------|
| Workflow OpenSSF Scorecard | `.github/workflows/scorecard.yml` |
| CodeQL SAST | `.github/workflows/codeql.yml` |
| SBOM + attestations en release | `.github/workflows/publish.yml` |
| Cobertura + headers de licencia en CI | `.github/workflows/ci.yml` |
| Docs de seguridad / gobernanza | `SECURITY.es.md`, `GOVERNANCE.es.md`, `docs/SECURITY_ASSURANCE.es.md` |

## Badge Scorecard

Tras el workflow Scorecard en `main` con `publish_results: true`:

```markdown
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/alejandrorodrom/quietreplay/badge)](https://scorecard.dev/viewer/?uri=github.com/alejandrorodrom/quietreplay)
```

Viewer: https://scorecard.dev/viewer/?uri=github.com/alejandrorodrom/quietreplay

## Badge Best Practices (manual)

1. Entra en https://www.bestpractices.dev con GitHub.
2. Añade el proyecto `https://github.com/alejandrorodrom/quietreplay` (serie metal).
3. Completa **Passing** y luego **Silver** con la documentación de este repo.
4. Deja pendientes los criterios Gold que exigen un segundo mantenedor hasta
   tener un colaborador Write que revise PRs.
5. Pon el markdown del badge (con tu ID de proyecto) en `README.md` / `README.es.md`.

## Verificar provenance SLSA

Tras un publish (no dry-run):

```bash
gh attestation verify --repo alejandrorodrom/quietreplay ./quietreplay-*.zip
```

Los assets del release incluyen `*.spdx.json`, `*.sigstore.json` y `*.intoto.jsonl`
para los checks **Signed-Releases** / **SBOM** de Scorecard.

## Protección de rama (solo admin)

`main` exige 1 approval + CODEOWNERS + status checks (CI, E2E, npm-audit,
CodeQL). Los admins **no** están forzados (`enforce_admins: false`) para no
bloquear al owner. Sube approvals a **2** cuando haya un segundo reviewer.
