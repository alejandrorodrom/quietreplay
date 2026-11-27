# Chrome Web Store / Edge Add-ons — QuietReplay

> Last Updated: 2026-11-26  
> Version to submit: **2.1.1**  
> ZIP: `pnpm run zip` → archivo en `.output/`

Use this file as the single source of truth when filling Partner Center and the Chrome Developer Dashboard. Copy fields as written unless noted.

---

## Store Listing

**Extension Name**  
QuietReplay

**Short Description (EN)** — matches `public/_locales/en/messages.json`  
Record a page and save the file on your computer. Nothing is sent online.

**Short Description (ES)** — matches `public/_locales/es/messages.json`  
Graba una página y guarda el archivo en tu equipo. No se envía nada a internet.

**Category**  
Developer Tools  
(Edge: same / closest Productivity if Developer Tools is unavailable)

**Single Purpose**  
Records what you do on one web page and saves a local file on your computer; nothing is sent online.

**Primary Language**  
English (`en`) — also ship Spanish listing (`es` / `es-ES`)

---

### Detailed Description (EN) — Chrome + Edge

QuietReplay records what you do on a web page and saves a file on your computer so you can review it later or send it to someone. Press Record, do what you want to show, then press Stop and save. Nothing is sent online and you do not need an account.

What you get
- A readable report of clicks, keys, page changes, console messages, and page errors
- Screenshots at key moments
- Optional tab video
- Optional network list (HAR) for what the page loaded
- Optional hiding of passwords and common private details in the saved files (beta); the video stays as you saw the screen

How to use it
1. Open a normal http or https page
2. Click the QuietReplay icon and press Record
3. Do what you want to show (you can close the popup; recording continues)
4. Open QuietReplay again and press Stop and save
5. Open the ZIP from your Downloads folder, or use Open a saved file in QuietReplay

Privacy
- Works only on your computer
- Saves to Downloads (default folder: quietreplay)
- Settings stay in this browser and are not synced to a cloud account
- Network access from the extension is blocked (connect-src none)

Requirements
- Chromium browser: Chrome 116+ or Microsoft Edge 116+
- Cannot record Chrome/Edge system pages, the store, or other extensions

Support and source: https://github.com/alejandrorodrom/quietreplay  
Privacy: https://github.com/alejandrorodrom/quietreplay/blob/main/PRIVACY.md  
Issues: https://github.com/alejandrorodrom/quietreplay/issues

---

### Detailed Description (ES) — Edge / listing ES

QuietReplay graba lo que haces en una página web y guarda un archivo en tu equipo, para verlo después o enviárselo a alguien. Pulsa Grabar, haz lo que quieres mostrar y pulsa Detener y guardar. No se envía nada a internet y no hay que crear una cuenta.

Qué incluye
- Un informe legible con clics, teclas, cambios de página, mensajes de la consola y errores
- Capturas en momentos clave
- Video opcional de la pestaña
- Lista opcional de red (HAR) de lo que cargó la página
- Opción beta para ocultar contraseñas y datos privados habituales en los archivos guardados; el video queda como viste la pantalla

Cómo usarla
1. Abre una página normal http o https
2. Pulsa el icono de QuietReplay y elige Grabar
3. Haz lo que quieres mostrar (puedes cerrar la ventana; la grabación sigue)
4. Abre QuietReplay otra vez y pulsa Detener y guardar
5. Abre el ZIP en Descargas, o usa Ver un archivo guardado

Privacidad
- Solo funciona en tu equipo
- Guarda en Descargas (carpeta por defecto: quietreplay)
- Los ajustes se quedan en este navegador y no se sincronizan a una cuenta en la nube
- La extensión no abre conexiones de red

Requisitos
- Navegador Chromium: Chrome 116+ o Microsoft Edge 116+
- No puede grabar páginas del sistema, la tienda ni otras extensiones

Soporte y código: https://github.com/alejandrorodrom/quietreplay  
Privacidad: https://github.com/alejandrorodrom/quietreplay/blob/main/PRIVACY.es.md  
Incidencias: https://github.com/alejandrorodrom/quietreplay/issues

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store icon (Chrome) | 128×128 PNG | ✅ Ready | `store/assets/store-icon-128.png` |
| Extension logo (Edge) | 300×300 PNG | ✅ Ready | `store/assets/logo-300.png` |
| Screenshot 1 | 1280×800 | ✅ Ready | `store/assets/screenshot-1-popup-ready.png` |
| Screenshot 2 | 1280×800 | ✅ Ready | `store/assets/screenshot-2-popup-recording.png` |
| Screenshot 3 | 1280×800 | ✅ Ready | `store/assets/screenshot-3-viewer.png` |
| Screenshot 4 | 1280×800 | ✅ Ready | `store/assets/screenshot-4-settings.png` |
| Small promo tile | 440×280 | ⬜ Optional | |
| Large / marquee tile | 1400×560 | ⬜ Optional | |

### Screenshots

Generated from the real UI with `pnpm run store:screenshots` (Playwright + built extension):

1. **Ready** — Demo Shop page + QuietReplay popup (Record).  
2. **Recording** — same page + Recording… / Stop and save + video status.  
3. **Viewer** — saved recording open (steps, console, failed request, errors).  
4. **Settings** — options page in English.

Regenerate anytime after UI changes with `pnpm run store:screenshots`.

---

## Permissions Justification

Paste each justification into Chrome Privacy tab / Edge Privacy → Permission justification.

| Permission | Type | Justification |
|------------|------|---------------|
| `activeTab` | permissions | Access the tab the user is viewing when they press Record or use the toolbar action, so QuietReplay can capture that page only after an explicit user action. |
| `scripting` | permissions | Inject the page helper that records clicks, keys, navigation, console messages, and screenshots while a recording is active. |
| `storage` | permissions | Save user settings (language, video on/off, redaction options, download folder name) locally in this browser with `chrome.storage.local`. Settings are not synced to a cloud account. |
| `downloads` | permissions | Write the recording ZIP into the user’s Downloads folder when they press Stop and save, and when they export from the viewer. |
| `tabCapture` | permissions | Capture the active tab’s media stream so QuietReplay can record an optional video of the page the user chose to record. |
| `offscreen` | permissions | Run the MediaRecorder in an offscreen document so tab video can be encoded reliably while the service worker stays lightweight. |
| `http://*/*` and `https://*/*` | optional_host_permissions | Requested only when the user starts recording, for that site’s origin, so recording can continue after a reload. Not granted for all sites up front; the user is prompted per site. |

**Remote code:** No. Select “No, I am not using remote code.” (Manifest V3; `connect-src 'none'`.)

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No (nothing is transmitted off the device).

QuietReplay may process page activity **locally** only while recording, and write it into a ZIP the user saves. That is not sent to the developer or any server.

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | — | No |
| Health info | No | No | — | No |
| Financial info | No | No | — | No |
| Authentication info | No | No | — | No |
| Personal communications | No | No | — | No |
| Location | No | No | — | No |
| Web history | No | No | — | No |
| User activity | Local only while recording | No | Build the local recording file the user saves | No |
| Website content | Local only while recording | No | Screenshots/video/network bodies if enabled, into the local ZIP | No |

### Data Use Certification

- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

In store disclosure checkboxes: do **not** claim collection/transmission of personal data. Align every checkbox with this table and with the privacy policy.

---

## Privacy Policy

**Privacy Policy URL (EN)**  
https://github.com/alejandrorodrom/quietreplay/blob/main/PRIVACY.md

**Privacy Policy URL (ES)**  
https://github.com/alejandrorodrom/quietreplay/blob/main/PRIVACY.es.md

Both files are already in the repo and publicly readable.

---

## Distribution

**Visibility**: Public  
**Regions**: All regions  

---

## Developer Info

**Publisher Name**  
Alejandro Rodriguez Romero

**Contact / Support**  
https://github.com/alejandrorodrom/quietreplay/issues

**Homepage**  
https://github.com/alejandrorodrom/quietreplay

**Contact email**  
<!-- Fill with the email you verify in Chrome / Partner Center (shown on the listing). -->


---

## Edge — Notes for certification (paste on Submit)

```
QuietReplay — how to test

1. Install the extension in Microsoft Edge 116+.
2. Open any normal https website (not edge:// or the Add-ons store).
3. Click the QuietReplay toolbar icon → press Record (or Grabar).
4. If Edge asks for site access, allow it so recording continues after reload.
5. Click a few links, type in a non-password field, optionally reload the page.
6. Open QuietReplay again → press Stop and save (Detener y guardar).
7. Check Downloads for a quietreplay-*.zip (default subfolder: quietreplay).
8. Optionally open QuietReplay → Open a saved file / Ver un archivo guardado and load that ZIP.

Expected: ZIP contains report.md, report.json, events, screenshots; video.webm if “Record a video” is on.
No network calls from the extension (connect-src none). No account required.
Language: English and Spanish in the UI.
```

---

## Chrome — first publish checklist

1. [ ] Register + pay one-time Chrome Web Store developer fee  
2. [ ] `pnpm run zip` and keep the `.output/*.zip`  
3. [ ] Dashboard → Add new item → upload ZIP  
4. [ ] Store listing: name, short + detailed description, category, icon 128, ≥1 screenshot  
5. [ ] Privacy: single purpose, permission justifications, remote code = No, data disclosure = none transmitted, privacy URL  
6. [ ] Distribution: Public  
7. [ ] Submit for review (consider deferred publish)

---

## Edge — first publish checklist

1. [ ] Partner Center → Edge workspace enrolled  
2. [ ] Create new extension → upload same Chromium ZIP  
3. [ ] Availability: Public + markets  
4. [ ] Properties: category, website, support URL  
5. [ ] Privacy: same purpose / permissions / remote code No / data / privacy URL  
6. [ ] Store listings EN (+ ES): description ≥250 chars, logo 300×300, screenshots  
7. [ ] Paste certification notes → Publish  

After the first version is **In the Store**, later updates can use the Partner Center Publish API / GitHub Actions.

---

## GitHub Actions (store updates)

Workflow: `.github/workflows/publish.yml` (manual `workflow_dispatch`, environment **`production`**).

**Prerequisite:** the first version of each store listing must exist (Chrome: item created; Edge: published at least once). The APIs cannot create a new product.

### Workflow shape

After CI/e2e/audit, **Build & release** runs once, then two store jobs can run **in parallel**:

- **Chrome Web Store** — status API + optional upload/publish  
- **Edge Add-ons** — draft upload + optional certification submit  

### Workflow inputs

| Input | Default | Effect |
|-------|---------|--------|
| `dry_run` | false | Build + checks only; no tag, release, or store upload |
| `upload_chrome` | false | Run the Chrome job: status + upload ZIP as **draft** |
| `upload_edge` | false | Run the Edge job: upload ZIP as **draft** (submit if `publish_stores`) |
| `publish_stores` | false | After upload: Chrome `publish` + Edge certification submit |
| `check_status` | false | Status-only path (Chrome: real API states; Edge: Partner Center note — no read-only review API) |
| `force_upload` | false | If in review: Chrome still uploads; Edge warns on `InProgressSubmission` and does **not** fail the job |

**Chrome in review:** submitted revision `PENDING_REVIEW` → job fails unless `force_upload` (with a warning in the Actions summary).

**Edge in review:** Microsoft has no “is it in review?” read API. If `publish_stores` hits `InProgressSubmission`, the job warns/fails unless `force_upload` (draft is kept). Partner Center remains the source of truth.

Local Chrome status (env vars `CLIENT_ID`, `CLIENT_SECRET`, `REFRESH_TOKEN`, `EXTENSION_ID`, `PUBLISHER_ID`):

```bash
pnpm run store:chrome-status
```

Recommended first automated run: `upload_chrome` and/or `upload_edge` = true, `publish_stores` = false. Confirm drafts, then re-run with `publish_stores` = true.

### Secrets (GitHub → Settings → Environments → **production**)

#### Chrome Web Store

| Secret | Where to get it |
|--------|-----------------|
| `CHROME_CLIENT_ID` | Google Cloud OAuth client (Desktop app) |
| `CHROME_CLIENT_SECRET` | Same OAuth client |
| `CHROME_REFRESH_TOKEN` | OAuth refresh token with Chrome Web Store scope |
| `CHROME_EXTENSION_ID` | ID in Chrome Developer Dashboard item URL |
| `CHROME_PUBLISHER_ID` | Chrome Web Store Developer Dashboard → Account / Settings |

Setup guide: https://github.com/fregante/chrome-webstore-upload-keys  
API enable: Chrome Web Store API in the same Google Cloud project. Scope: `https://www.googleapis.com/auth/chromewebstore`.

#### Microsoft Edge Add-ons

| Secret | Where to get it |
|--------|-----------------|
| `EDGE_CLIENT_ID` | Partner Center → Edge → your extension → **Publish API** |
| `EDGE_API_KEY` | Same page (create/renew; keys expire ~every **72 days**) |
| `EDGE_PRODUCT_ID` | Extension Overview → Product ID (**GUID**, not the 32-char store ID in the public URL) |

Docs: https://learn.microsoft.com/en-us/microsoft-edge/extensions/update/api/using-addons-api

### Typical release flow

1. Bump `version` in `package.json` / `wxt.config.ts` (must be **greater** than the live store version).  
2. Commit and push.  
3. Actions → **Publish extension release** → enable the upload flags you need.  
4. Wait for Google/Microsoft review (Edge certification can take up to ~7 business days).

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 2.1.1 | 2026-11-26 | Initial store submission package | Draft |

---

## Review Notes

### Known Issues / Limitations

- Cannot record `chrome://`, `edge://`, Web Store / Add-ons pages, or other extension pages (browser restriction).  
- Host access is optional and requested when recording starts for that origin.  
- Private-details redaction is beta; video is not redacted.  
- One page recording at a time.

### Rejection History

_(none yet)_
