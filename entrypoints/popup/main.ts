import { t } from '../../lib/i18n';
import type { Locale, Settings, TabStatus } from '../../lib/types';

const statusEl = document.getElementById('status')!;
const statusTextEl = document.getElementById('status-text')!;
const introEl = document.getElementById('intro')!;
const videoStatusEl = document.getElementById('video-status')!;
const localeEl = document.getElementById('locale') as HTMLSelectElement;
const filenameField = document.getElementById('filename-field')!;
const filenameEl = document.getElementById('filename') as HTMLInputElement;
const filenameLabel = filenameField.querySelector('label')!;
const filenameHint = document.getElementById('filename-hint')!;
const toggleBtn = document.getElementById('toggle') as HTMLButtonElement;
const optionsLink = document.getElementById('options') as HTMLAnchorElement;
const viewerLink = document.getElementById('viewer') as HTMLAnchorElement;
const titleEl = document.getElementById('title')!;

type StatusResponse = {
  status: TabStatus;
  settings: Settings;
  videoActive?: boolean;
  videoEnabled?: boolean;
  lastVideoError?: string | null;
  suggestedFilename?: string;
};

function isRecording(status: TabStatus) {
  return status === 'armed' || status === 'saving' || status === 'ready';
}

function applyLocale(locale: Locale, res: StatusResponse) {
  const { status } = res;
  document.documentElement.lang = locale;
  titleEl.textContent = t(locale, 'appName');
  const statusKey =
    status === 'armed'
      ? 'statusArmed'
      : status === 'saving'
        ? 'statusSaving'
        : status === 'ready'
          ? 'statusReady'
          : 'statusIdle';
  statusTextEl.textContent = t(locale, statusKey);
  const introKey =
    status === 'armed'
      ? 'introArmed'
      : status === 'saving'
        ? 'introSaving'
        : status === 'ready'
          ? 'introReady'
          : 'introIdle';
  introEl.textContent = t(locale, introKey);
  statusEl.dataset.state = status;
  const recording = isRecording(status);
  toggleBtn.dataset.recording = recording ? 'true' : 'false';
  toggleBtn.textContent = t(locale, recording ? 'stopAndSave' : 'arm');
  toggleBtn.disabled = status === 'saving';
  optionsLink.textContent = t(locale, 'openOptions');
  viewerLink.textContent = t(locale, 'openViewer');
  filenameLabel.textContent = t(locale, 'zipFilename');
  filenameHint.textContent = t(locale, 'zipFilenameHint');
  const label = localeEl.previousElementSibling;
  if (label) label.textContent = t(locale, 'language');

  filenameField.hidden = !recording || status === 'saving';
  if (recording && res.suggestedFilename && !filenameEl.dataset.touched) {
    filenameEl.value = res.suggestedFilename;
  }

  if (!recording || !res.videoEnabled) {
    videoStatusEl.hidden = true;
    videoStatusEl.textContent = '';
    return;
  }
  videoStatusEl.hidden = false;
  if (res.videoActive) {
    videoStatusEl.textContent = t(locale, 'videoOn');
    videoStatusEl.dataset.state = 'on';
  } else if (res.lastVideoError) {
    videoStatusEl.textContent = t(locale, 'videoError');
    videoStatusEl.dataset.state = 'error';
  } else {
    videoStatusEl.textContent = t(locale, 'videoOff');
    videoStatusEl.dataset.state = 'off';
  }
}

async function refresh() {
  const res = (await chrome.runtime.sendMessage({
    type: 'qr:get-status',
  })) as StatusResponse;
  localeEl.value = res.settings.locale;
  applyLocale(res.settings.locale, res);
  return res;
}

async function prepareStartPermissions() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && /^https?:/i.test(tab.url)) {
    try {
      const originPattern = `${new URL(tab.url).origin}/*`;
      const hasOrigin = await chrome.permissions.contains({
        origins: [originPattern],
      });
      if (!hasOrigin) {
        await chrome.permissions.request({ origins: [originPattern] });
      }
    } catch {
      /* optional for reload persistence */
    }
  }
}

filenameEl.addEventListener('input', () => {
  filenameEl.dataset.touched = '1';
});

toggleBtn.addEventListener('click', async () => {
  const recording = toggleBtn.dataset.recording === 'true';
  toggleBtn.disabled = true;
  if (!recording) {
    filenameEl.dataset.touched = '';
    // Fire start first so tabCapture still sees the user gesture.
    await chrome.runtime.sendMessage({ type: 'qr:toggle' });
    void prepareStartPermissions();
  } else {
    await chrome.runtime.sendMessage({
      type: 'qr:toggle',
      filename: filenameEl.value,
    });
    filenameEl.dataset.touched = '';
  }
  await refresh();
});

localeEl.addEventListener('change', async () => {
  const locale = localeEl.value as Locale;
  await chrome.runtime.sendMessage({
    type: 'qr:save-settings',
    patch: { locale },
  });
  await refresh();
});

optionsLink.addEventListener('click', (e) => {
  e.preventDefault();
  void chrome.runtime.openOptionsPage();
});

viewerLink.addEventListener('click', (e) => {
  e.preventDefault();
  void chrome.tabs.create({
    url: chrome.runtime.getURL('/viewer.html'),
  });
});

void refresh();
