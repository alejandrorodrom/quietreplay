# Postura OpenSSF (Scorecard, Best Practices, SLSA)

[English](./OPENSSF.md)

QuietReplay apunta a un Scorecard alto, badge OpenSSF Best Practices
(Passing → Silver; Gold cuando haya un segundo reviewer) y provenance SLSA
en los ZIP de GitHub Releases.

## Snapshot actual de Scorecard

Resultados públicos: https://scorecard.dev/viewer/?uri=github.com/alejandrorodrom/quietreplay  
API: https://api.scorecard.dev/projects/github.com/alejandrorodrom/quietreplay

| Check | Típico | Notas |
|-------|--------|--------|
| Security-Policy, Dangerous-Workflow, Binary-Artifacts, Dependency-Update-Tool, Token-Permissions, Pinned-Dependencies, Vulnerabilities, License, Fuzzing, CI-Tests | 10 | Ya automatizado |
| SAST | ~9 | CodeQL en push/PR; sube conforme más commits lo pasen |
| CII-Best-Practices | 5 | Badge Passing; Silver/Gold piden más criterios + 2.º mantenedor |
| Contributors | 3 | Hacen falta contribuidores de ≥2 orgs |
| Code-Review | 0 | Hacen falta approvals humanos en cambios recientes |
| Maintained | 0 | Automático hasta que el repo tenga >90 días con actividad |
| Branch-Protection | −1 / error | Aplicar ruleset (abajo); evita classic BP sin `SCORECARD_TOKEN` |
| Signed-Releases | −1 | Aún no hay GitHub Releases — ejecuta `publish.yml` una vez |
| Packaging | −1 | Esperado: Scorecard solo detecta hubs npm/pypi/docker, no Chrome Web Store / ZIP de Release |

Los checks en `-1` son inconclusos y **no** entran en el promedio. Convertir
Signed-Releases y Branch-Protection en scores altos sube la nota global.

## Ya automatizado en este repo

| Control | Dónde |
|---------|--------|
| Workflow OpenSSF Scorecard | `.github/workflows/scorecard.yml` |
| CodeQL SAST | `.github/workflows/codeql.yml` |
| SBOM + attestations en release | `.github/workflows/publish.yml` |
| Cobertura + headers de licencia en CI | `.github/workflows/ci.yml` |
| Docs de seguridad / gobernanza | `SECURITY.es.md`, `GOVERNANCE.es.md`, `docs/SECURITY_ASSURANCE.es.md` |
| Helper de ruleset | `scripts/configure-github-protection.sh` |

## Badge Scorecard

Tras el workflow Scorecard en `main` con `publish_results: true`:

```markdown
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/alejandrorodrom/quietreplay/badge)](https://scorecard.dev/viewer/?uri=github.com/alejandrorodrom/quietreplay)
```

Viewer: https://scorecard.dev/viewer/?uri=github.com/alejandrorodrom/quietreplay

## Playbook de remediación (más impacto primero)

### 1. Protección de rama (ruleset)

```bash
gh auth login -h github.com
./scripts/configure-github-protection.sh
gh workflow run "Scorecard supply-chain security"
```

Por defecto: bypass de admin ON (útil en solo-mantenedor). Cuando haya un
segundo reviewer con Write, re-ejecuta con `STRICT_ADMIN=1` para un score de
Branch-Protection más alto.

Opcional: secret `SCORECARD_TOKEN` (PAT fine-grained, Administration: Read)
solo si mantienes branch protection **clásica**. Prefiere rulesets.

### 2. Primer release firmado (Signed-Releases → 10)

`publish.yml` ya adjunta `*.sigstore.json` y `*.intoto.jsonl`.

```bash
gh workflow run "Publish extension release" -f dry_run=false
```

Verificar:

```bash
gh attestation verify --repo alejandrorodrom/quietreplay ./quietreplay-*.zip
```

### 3. Code-Review

Fusiona vía PRs con aprobación **humana** (los bots no cuentan). Invita al
menos un colaborador Write; mantén `CODEOWNERS` apuntando a reviewers.

### 4. Packaging

Déjalo inconcluso. QuietReplay se distribuye por Chrome Web Store / Edge
Add-ons y ZIPs firmados en GitHub Releases — el probe Packaging de Scorecard
no reconoce ese camino. No añadas un `npm publish` ficticio solo para el
check.

### 5. Maintained / Contributors / Best Practices Gold

- Maintained: sigue committeando; el score se recupera a los 90 días desde la creación.
- Contributors: da la bienvenida a contribuidores de otras orgs.
- Best Practices Silver/Gold: continúa en https://www.bestpractices.dev/projects/17177

## Badge Best Practices (manual)

1. Entra en https://www.bestpractices.dev con GitHub.
2. Proyecto: `https://github.com/alejandrorodrom/quietreplay` (serie metal, id `17177`).
3. Completa **Passing** y luego **Silver** con la documentación de este repo.
4. Deja pendientes los criterios Gold que exigen un segundo mantenedor hasta
   tener un colaborador Write que revise PRs.
5. El markdown del badge ya está en `README.md` / `README.es.md`.

## Verificar provenance SLSA

Tras un publish (no dry-run):

```bash
gh attestation verify --repo alejandrorodrom/quietreplay ./quietreplay-*.zip
```

Los assets del release incluyen `*.spdx.json`, `*.sigstore.json` y `*.intoto.jsonl`
para los checks **Signed-Releases** / **SBOM** de Scorecard.
