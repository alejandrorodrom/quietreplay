# Architecture

[Español](./ARCHITECTURE.es.md)

QuietReplay is a Manifest V3 Chromium extension that records user activity on
a normal web page and writes a local ZIP (HAR + optional video + metadata).
Nothing is uploaded to QuietReplay servers.

## High-level components

```text
┌─────────────┐     messages      ┌──────────────────┐
│ Popup /     │ ◄───────────────► │ Background       │
│ Options UI  │                   │ (service worker) │
└─────────────┘                   └────────┬─────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
             ┌────────────┐         ┌────────────┐         ┌────────────┐
             │ Bridge /   │         │ Offscreen  │         │ Downloads  │
             │ content    │         │ (video)    │         │ (ZIP file) │
             └────────────┘         └────────────┘         └────────────┘
                    │
                    ▼
             Page DOM events, console, network notes
```

| Piece | Role |
|-------|------|
| **Background** (`entrypoints/background.ts`) | Session state, arm/stop, assemble package, permissions, toolbar badge |
| **Bridge** (`entrypoints/bridge.ts`) | Page-side capture hooks; talks to background |
| **Popup / Options** | User controls, settings, language |
| **Viewer** | Local UI to open a saved package |
| **Offscreen document** | Optional tab video capture via `tabCapture` |
| **`lib/*`** | Pure helpers: HAR, ZIP, redact, settings, selectors, buffers |

## Data flow

1. User presses **Record** → background arms the active tab and injects/enables bridge.
2. Bridge observes page interactions; background buffers structured events.
3. Optional video runs in an offscreen document.
4. **Stop and save** → build HAR/report ZIP in memory → `downloads` API writes to disk.
5. Closing the tab discards an in-progress recording; reload does not stop it.

## Trust boundaries

| Boundary | Trust |
|----------|-------|
| Extension process ↔ web page | Page is untrusted; bridge must not exfiltrate; CSP `connect-src 'none'` |
| Extension ↔ disk | User-controlled Downloads folder |
| Extension ↔ network | **None** for QuietReplay backends; page may still make its own requests |
| Settings storage | `chrome.storage` local to the browser profile |

## Build

- Tooling: [WXT](https://wxt.dev/) + TypeScript + pnpm.
- Production artifact: Chrome MV3 directory / ZIP from `pnpm run zip`.
- CI: lint, typecheck, unit tests, no-network check, Playwright e2e.
