<!-- QuietReplay logo: switches with GitHub light/dark theme. -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="logo/quietreplay-logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="logo/quietreplay-logo-light.svg">
    <img alt="QuietReplay" src="logo/quietreplay-logo-light.svg" width="360">
  </picture>
</p>

# QuietReplay

Records what happens on a Chrome page and saves it on your computer. No technical knowledge needed: press **Record**, show what went wrong, then press **Stop and save**. Nothing is sent online, and there is no account to create.

[Español](./README.es.md) · [Privacy](./PRIVACY.md) · [Contributing](./CONTRIBUTING.md) · [Security](./SECURITY.md)

## How to use it

1. Open the page you want to show.
2. Click the QuietReplay icon, then **Record**.
3. Do on the page what you want to show. Reloading the page does not stop the recording.
4. Press **Stop and save**.

The file goes to **Downloads**, inside the `quietreplay` folder. You can change the file name, but you do not have to.

## Keyboard shortcuts

| Shortcut | What it does |
|----------|----------------|
| `Alt+Shift+R` | Start recording, or stop and save |
| `Alt+Shift+B` | Stop and save |
| `Alt+Shift+L` | Open QuietReplay |

## Settings

You can record without changing anything. **Settings** lets you choose:

- whether to save what the page loads
- whether to record a video
- whether to hide passwords and private information (off until you turn it on; **beta**)
- the folder inside Downloads
- the language: **English / Español**

The recording keeps everything from **Record** to **Stop and save**.

**More settings** (only takes effect if you turned on hiding passwords and private information) lets you customize what gets covered. If you are not sure, leave both empty.

**Text you want hidden** — write one word or code per line. If it appears in the report or in what the page loaded, it is replaced with `[REDACTED]`. For example:

```
ana.garcia@company.com
EMP-94821
sk_live_abc123
```

**Parts of the page you want blurred** — write one CSS selector per line (the same kind of selector Chrome DevTools Inspect uses). Those areas look blurred in screenshots and video. For example:

```
#profile
.private-data
input[name="phone"]
[data-testid="account-number"]
```

## Install from source

```bash
pnpm install
pnpm run build
```

Open `chrome://extensions` → Developer mode → **Load unpacked** → select `.output/chrome-mv3`.

The extension opens no network connections (`connect-src 'none'`). It asks for access to the site only when you record, so a reload does not stop the recording. Requires Chrome 116 or newer. It does not store what you type into fields: it only notes where you clicked. Page video uses Chrome tab capture.

The file includes a readable report, screenshots, a video when that option is on, and the detail of what the page loaded.

## Scripts

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [license](./license).
