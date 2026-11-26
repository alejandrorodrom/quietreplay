import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    version: '2.1.0',
    // tabCapture + offscreen required: video is on by default and optional
    // grants often fail silently when starting from the popup.
    permissions: [
      'activeTab',
      'scripting',
      'storage',
      'downloads',
      'tabCapture',
      'offscreen',
    ],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    minimum_chrome_version: '116',
    action: {
      default_title: '__MSG_actionTitle__',
    },
    commands: {
      arm: {
        suggested_key: { default: 'Alt+Shift+R' },
        description: '__MSG_cmdArm__',
      },
      save: {
        suggested_key: { default: 'Alt+Shift+B' },
        description: '__MSG_cmdSave__',
      },
      _execute_action: {
        suggested_key: { default: 'Alt+Shift+L' },
      },
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'none'; connect-src 'none'; img-src 'self' blob: data:; media-src 'self' blob:",
    },
  },
  vite: () => ({
    // Keep absolute `/chunks/...` paths so offscreen.html resolves inside the
    // extension root (relative `./` wrongly emits `../../chunks/...`).
    build: {
      target: 'esnext',
    },
  }),
});
