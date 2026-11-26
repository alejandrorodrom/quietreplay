<!-- QuietReplay logo: switches with GitHub light/dark theme. -->
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="logo/quietreplay-logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="logo/quietreplay-logo-light.svg">
    <img alt="QuietReplay" src="logo/quietreplay-logo-light.svg" width="360">
  </picture>
</p>

# QuietReplay

QuietReplay records what you do on a web page and saves a file on your computer, so you can watch it later or send it to someone. Press **Record**, do what you want to show, then press **Stop and save**. Nothing is sent online, and there is no account.

[Español](./README.es.md) · [Privacy](./PRIVACY.md) · [Contributing](./CONTRIBUTING.md) · [Security](./SECURITY.md)

The words below are the same words on the screen.

## Record a page

1. Open the page. It has to be a normal website (the address starts with `http://` or `https://`). QuietReplay cannot record Chrome’s own pages, the Chrome Web Store, or another extension.
2. Click the QuietReplay icon. The tooltip says **QuietReplay — record this page**.
3. Press **Record**. Chrome may ask to access that site. Allow it if you will reload the page. If you refuse, this view can still be recorded, but a reload can stop new notes from the page.
4. Do what you want to show. You can close the QuietReplay window: the recording continues. Reloading the page does not stop it. Closing the tab throws the recording away and does not save it.
5. Open QuietReplay again and press **Stop and save**.

Record one page at a time. The video belongs to the tab where you last pressed **Record**.

### What the window says

| What you see | When |
|--------------|------|
| **Ready** | Nothing is being recorded on this tab. The text says to press **Record**. |
| **Recording…** | QuietReplay is recording. The text says to press **Stop and save** when you are done. The button turns red. |
| **Saving…** | The file is being written. The button is disabled. |
| **Saved** | The file is in Downloads. The text tells you to look there. |

While you are recording, **File name** appears. You can change it. If you leave it, that name is used. The field hides again while the file is saving.

If **Record a video** is on, a line under the button says one of these:

- **Starting the video…**
- **The video is recording too**
- **The video could not be recorded. Everything else is still saved.**

**Language** is **English** or **Español**. Changing it here is saved at once. The same choice is in **Settings**, where you still press **Save settings**. The first time you open QuietReplay, it follows Chrome: Spanish if Chrome’s language is Spanish, English otherwise.

**View a saved file** opens the page described in [View a saved file](#view-a-saved-file).

**Settings** opens the page described in [Settings](#settings).

### The toolbar icon

| Badge | Meaning |
|-------|---------|
| **REC** | This tab is recording. |
| **…** | This tab is saving. |
| **✓** | Just saved. It disappears after a moment. |

A reload does not clear **REC** while the recording is still going.

## Keyboard shortcuts

Chrome suggests these. You can change them at `chrome://extensions/shortcuts`. On a Mac, Alt is the Option key.

| Shortcut | What it does |
|----------|----------------|
| `Alt+Shift+R` | Start recording, or stop and save |
| `Alt+Shift+B` | Stop and save. If this tab is not recording, nothing happens. |
| `Alt+Shift+L` | Open QuietReplay |

## Settings

You can record without changing anything. Press **Save settings** when you do change them. QuietReplay remembers the choice in this browser. It is not copied to your Google account.

The folder, the language, and **Hide passwords and private details** are used when you press **Stop and save**.

**Save what the page loads** and **Record a video** are used the next time you press **Record**. If the page reloads during a recording, **Save what the page loads** is read again.

| Setting | Starts as | What it does |
|---------|-----------|----------------|
| **Language** | Chrome’s language | English or Español, for QuietReplay and for the readable report. |
| **Save what the page loads** | On | Keeps the data the page sends and receives. Turn it off if the file would be too large. The file still notes that a request happened. |
| **Record a video** | On | A video of the page, so you can watch it later. |
| **Hide passwords and private details** | Off | Covers passwords and private text in the file, and blurs fields in screenshots. The video is the screen as you saw it. |
| **Folder in Downloads** | `quietreplay` | Files go inside this folder. If you clear it, the name `quietreplay` is used. Slashes are removed. |
| **More ways to hide** | Empty | Only used when **Hide passwords and private details** is on. It opens by itself if you already saved something here. |

**Words to hide in the file** — one word or phrase per line. If it appears in the file, it is replaced with `[REDACTED]`. A plain word is enough. The match ignores capitals. Characters such as `(` and `[` start a pattern: if you do not close them, **Save settings** does not save and the line is named in the message **This line cannot be used**.

**Areas to blur** — one per line. These are the names Chrome shows when you inspect the page. They look blurred in screenshots. Leave this empty if you are not sure. To copy a name:

1. Right-click the area on the page and choose **Inspect**.
2. Right-click the highlighted line and choose **Copy**, then **Copy selector**.
3. Paste it on its own line.

A name that matches nothing is saved and simply does not blur anything.

After a successful save, the page says **Settings saved**.

## What is recorded

The file keeps the whole time from **Record** to **Stop and save**. There is no time limit.

| Included | Not included |
|----------|----------------|
| Clicks, as the words on the button or link (not the text sitting in a box) | What you typed, stored as the contents of a field |
| Each key you press. In a password box the note is `*`. In other boxes it is the key itself, unless hiding is on, which also uses `*` for letters in text boxes. Shift, Ctrl, Alt, and the Command key alone are skipped. Space is written as Space. | Other tabs |
| Each time the page changes address, with the address and the title | Pictures, styles, and other files the browser loads on its own |
| Errors the page hits | QuietReplay’s own addresses |
| Messages the page writes for itself (what a developer calls the console) | |
| Requests the page makes. A request “did not load” when it failed or the site answered with an error. | |
| Screenshots when you click, when the page changes, and one when you stop. At most one every 2 seconds. | |
| A video of that tab, if **Record a video** is on and the recording succeeds | |

Hiding, when you turn it on, covers common private text in the file: email addresses, phone numbers, card numbers, IP addresses, passwords in a web address, and long secret-looking strings. It also covers request headers that carry a sign-in, a cookie, or a token. It can miss something you consider private, and it can cover something you wanted to keep (an email address, for example). Your extra lines under **Words to hide in the file** are applied too.

Screenshots blur text fields, text areas, and any **Areas to blur** you listed. The blur is only for the picture. The video stays as you saw the screen.

## The file

A recording is saved straight to **Downloads**, inside the folder from Settings (usually `quietreplay`). QuietReplay does not ask where to put it. If Chrome is set to ask where to save every file, Chrome still asks.

The name looks like `quietreplay-20261126-133045-example.com.zip`: the word quietreplay, the date, the time, and the site. Characters that cannot be in a file name are replaced. `.zip` is added if you omit it. The name is shortened if it is very long.

Open the ZIP and you find:

| File | What it is |
|------|------------|
| `report.md` | A readable report in the language you had selected: what you did, page errors, what did not load, and your browser (name, window size, screen density, language, time zone). |
| `report.json` | The same facts in a structured file. The schema name is `quietreplay/v1`. |
| `console.json` | The messages from the page, with the time and the kind of message. |
| `events.json` | The full timeline. |
| `network.har` | The page’s requests, only if there were any. HAR is a common way to store a list of requests. You do not need it to understand the recording. |
| `screenshots/001-….jpg` | The pictures, in order. |
| `video.webm` | The video, only if it was recorded. |

In the readable report, a step is one of: **Click on "…"**, **Click on the page**, **Pressed the … key**, **Pressed a key**, or **Opened** followed by the page name.

## View a saved file

From the QuietReplay window, choose **View a saved file**. The page title is **Saved files**, with the QuietReplay logo beside it. Nothing is uploaded.

**Open files**, or drop a file anywhere on the page. You can open several at once.

- A recording opens as one item in **Recordings**.
- A file that contains several recordings opens all of them. If **Title** is empty, it is filled with the title stored in that file.
- Each item shows its name, the site, and how many seconds it lasted.
- Click an item to see it. The current one is highlighted.
- **Rename** (the pencil, or a double-click on the name): type the new name, then press Enter or click away. Escape cancels. An empty name keeps the old one. This name is for the list and for a file you save next. It does not change the file already in Downloads.
- **Close** (the ×) removes it from the list. The file in Downloads stays.
- Large videos use memory in this tab. Close recordings you no longer need.

If the file cannot be used, the page says one of:

- **QuietReplay did not make this file.**
- **This file could not be opened.**
- **A recording is missing inside the file:** followed by the inner name. The other recordings still open.
- **This file has no recordings inside.**

### One recording

| Part of the page | What it shows |
|------------------|---------------|
| The name | The name in the list. |
| The page title and address | Where it was recorded. |
| The time line | Start, end, length in seconds, and the QuietReplay version. |
| **Private details were hidden when this was saved** | Shown only if hiding was on when the file was saved. |
| **At a glance** | Counts for **Errors**, **Did not load**, **Clicks**, and **Screenshots**. |
| **Time in the recording** | A clock such as `+0.0s`. It follows the video. |
| **Video** | The player, filling the space beside the steps, or **No video in this recording.** The picture stays whole. |
| **What you did** | Each step with its time, or **No clicks or page changes were noted.** |
| **Messages from the page** | Each message with its time. **Show** filters them: **All**, **Errors**, **Warnings**, **Notes**, **Info**, **Details**. If the filter matches nothing: **No messages for this filter.** |
| **What did not load** | The request, the answer code, the address, and how long it took, or **Nothing failed to load.** |
| **Page errors** | The error text, or **No errors appeared.** |

When there is a video, the page says: **The highlight follows the video. Click a step to jump to that moment. Click a message, a failed load, or an error to see its detail.** A step moves the video. The button’s name is **Jump to** and the time. A message, a failed load, or an error opens a window with the full text. **Close** dismisses it. Press Esc or click outside to dismiss it too. If there is a video, **Jump to** is in that window. On a failed load, **Copy request**, **Copy response**, and **Copy as curl** copy that text. **Copied** appears when it works. **Copy failed** appears when it does not.

When there is no video, the page says: **There is no video, so the lists do not move with time. Click a message, a failed load, or an error to see its detail.**

### Save together

**Save together** puts every open recording into a single file, so you can share them together.

| Control | What it does |
|---------|----------------|
| **Title** | Optional. If you leave it empty, the title is **QuietReplay recordings**. |
| **File name** | Optional. The gray text is an automatic name. Leave the box blank to use it. |
| **Save as one file** | Disabled until a recording is open. Chrome asks where to save. This file does not have to go in the QuietReplay folder. |

While it saves, the page says **Saving…**, then **Saved to Downloads.** If it cannot save, it says **Could not save the file.**

That file contains `bundle.json` (schema `quietreplay-bundle/v1`, with the title and the list) and one ZIP per recording inside a `cases` folder. Open it later with **Open files** and every recording comes back with its name.

## Install from source

```bash
pnpm install
pnpm run build
```

Open `chrome://extensions` → Developer mode → **Load unpacked** → select `.output/chrome-mv3`.

Requires Chrome 116 or newer. The extension opens no network connections (`connect-src 'none'`).

## Scripts

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT — see [license](./license).
