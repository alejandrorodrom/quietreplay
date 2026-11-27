#!/usr/bin/env bash
# Configure a GitHub repository ruleset for OpenSSF Scorecard Branch-Protection.
# Rulesets are preferred over classic branch protection so Scorecard can read
# settings without an admin PAT.
#
# Usage:
#   gh auth login -h github.com   # scopes: repo (admin)
#   ./scripts/configure-github-protection.sh
#
# Optional env:
#   OWNER_REPO   default: alejandrorodrom/quietreplay
#   BRANCH       default: main
#   STRICT_ADMIN default: 0  — set to 1 to remove admin bypass (higher Scorecard,
#                              but blocks a solo maintainer from merging their own PRs)
set -euo pipefail

OWNER_REPO="${OWNER_REPO:-alejandrorodrom/quietreplay}"
BRANCH="${BRANCH:-main}"
STRICT_ADMIN="${STRICT_ADMIN:-0}"
RULESET_NAME="Protect ${BRANCH} (Scorecard)"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required" >&2
  exit 1
fi

if ! gh auth status -h github.com >/dev/null 2>&1; then
  echo "GitHub auth failed. Run: gh auth login -h github.com" >&2
  exit 1
fi

echo "→ Applying ruleset on ${OWNER_REPO} for branch '${BRANCH}' (STRICT_ADMIN=${STRICT_ADMIN})"

EXISTING_ID="$(
  gh api "repos/${OWNER_REPO}/rulesets" --paginate \
    --jq ".[] | select(.name == \"${RULESET_NAME}\") | .id" \
    2>/dev/null | head -n1 || true
)"
if [[ -n "${EXISTING_ID}" ]]; then
  echo "  Removing previous ruleset id=${EXISTING_ID}"
  gh api -X DELETE "repos/${OWNER_REPO}/rulesets/${EXISTING_ID}" >/dev/null
fi

# Job check names must match workflow job `name:` (or the job id if unnamed).
# CI → build | E2E → "E2E classic" | npm-audit → dependencies | CodeQL → Analyze (...)
PAYLOAD="$(STRICT_ADMIN="${STRICT_ADMIN}" BRANCH="${BRANCH}" RULESET_NAME="${RULESET_NAME}" python3 - <<'PY'
import json, os

strict = os.environ["STRICT_ADMIN"] == "1"
branch = os.environ["BRANCH"]
name = os.environ["RULESET_NAME"]

payload = {
    "name": name,
    "target": "branch",
    "enforcement": "active",
    "conditions": {
        "ref_name": {
            "include": [f"refs/heads/{branch}"],
            "exclude": [],
        }
    },
    "rules": [
        {"type": "deletion"},
        {"type": "non_fast_forward"},
        {
            "type": "pull_request",
            "parameters": {
                "required_approving_review_count": 1,
                "dismiss_stale_reviews_on_push": True,
                "require_code_owner_review": True,
                "require_last_push_approval": False,
                "required_review_thread_resolution": False,
            },
        },
        {
            "type": "required_status_checks",
            "parameters": {
                "strict_required_status_checks_policy": True,
                "required_status_checks": [
                    {"context": "build"},
                    {"context": "E2E classic"},
                    {"context": "dependencies"},
                    {"context": "Analyze (javascript-typescript)"},
                ],
            },
        },
    ],
}

# RepositoryRole actor_id 5 = Admin. Any bypass actor makes Scorecard treat
# EnforceAdmins as false (caps Branch-Protection below tier 5 / 10).
if not strict:
    payload["bypass_actors"] = [
        {
            "actor_id": 5,
            "actor_type": "RepositoryRole",
            "bypass_mode": "always",
        }
    ]

print(json.dumps(payload))
PY
)"

echo "${PAYLOAD}" | gh api -X POST "repos/${OWNER_REPO}/rulesets" --input - \
  --jq '{id,name,enforcement,target,bypass_actors}'

echo
echo "✓ Ruleset applied."
echo "  Next:"
echo "    1) gh workflow run scorecard.yml"
echo "    2) First signed release: gh workflow run \"Publish extension release\" -f dry_run=false"
echo
if [[ "${STRICT_ADMIN}" != "1" ]]; then
  echo "  Note: admin bypass is ON (solo-maintainer friendly)."
  echo "  For max Branch-Protection, re-run with STRICT_ADMIN=1 after a second reviewer joins."
fi
