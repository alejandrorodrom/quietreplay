# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

[Español](./CHANGELOG.es.md)

## [Unreleased]

## [2.1.0] - 2026-11-26

### Added

- Page to open saved QuietReplay files on this computer, rename them, and save several recordings as one file (`quietreplay-bundle/v1`)

### Changed

- Popup, settings, and the saved-files page use everyday words, and the README describes every control on those screens
- The saved-files page shows the whole video. The screenshot strip is gone; the count stays under **At a glance**, and the pictures stay in the file

### Removed

- Screenshot strip on the saved-files page

## [2.0.0] - 2026-11-26

### Changed

- Recording keeps the whole session from **Record** to **Stop and save** (no timed buffer window)
- Popup, settings, and the Chrome description now use everyday language: the main action is **Record**
- Hiding passwords and private information stays off until you turn it on
- The readable report describes clicks in words, without page codes
- Report steps name the key that was pressed, and click labels use button text / input labels (aria-label, `<label>`, placeholder, field shells) without reading typed values
- Report JSON and Markdown include every step, error, and failed request (no caps)
- Capture keeps the full session: no event/screenshot/video/body/console size caps

### Removed

- Settings option for buffer duration (30s–5m)

## [1.0.0] - 2026-11-25

### Added

- Local Chrome MV3 bug-capture extension (start / stop / save) with circular buffer
- Console, errors, clicks, navigation, screenshots; video and network bodies on by default
- Popup shows clear recording / stopped state; capture survives reloads until stopped
- Network capture (fetch/XHR) and HAR 1.2; extension `chrome-extension://` traffic excluded
- Optional obfuscation (redaction + input blur), off by default
- Tab video via `tabCapture` + offscreen MediaRecorder
- Options page: buffer duration, network bodies, video, obfuscation, download folder, extra rules, language ES/EN
- ZIP export: `report.json`, `report.md`, `console.json`, `events.json`, `network.har`, screenshots, optional `video.webm`
- Zero-network CI check, unit tests, Playwright e2e
- Bilingual docs (EN/ES), SECURITY, CONTRIBUTING, PRIVACY, community templates

## [0.1.0] - 2026-11-25

### Added

- Initial scaffold and core capture pipeline (superseded by 1.0.0 in the same release train)
