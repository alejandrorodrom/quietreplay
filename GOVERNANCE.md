# Project governance

[Español](./GOVERNANCE.es.md)

## Decision making

QuietReplay is maintained by the repository owner. Day-to-day product and
security decisions are made by the maintainer. Public discussion happens in
GitHub Issues and Pull Requests.

## Roles

| Role | Who | Responsibilities |
|------|-----|------------------|
| **Maintainer / Owner** | [@alejandrorodrom](https://github.com/alejandrorodrom) | Merge PRs, cut releases, respond to security reports, set roadmap |
| **Contributor** | Anyone with an accepted PR | Propose changes via pull requests; follow CONTRIBUTING |

When a second collaborator joins with Write access, they may review pull
requests. Required approval count may then rise to two (see branch rules).

## Merging and releases

- External changes land only through pull requests.
- The owner may bypass review rules for their own work when needed.
- Releases are created via the `Publish extension release` workflow
  (`workflow_dispatch`) using the `production` environment.
- Version numbers follow SemVer in `package.json` / `wxt.config.ts`.

## Continuity

If the maintainer becomes unavailable, project continuity depends on GitHub
repository transfer or collaborator elevation. Until a second maintainer is
named, the bus factor is 1. A lockbox / succession note for credentials is
maintainer-private and out of this repository.

## Code of conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
