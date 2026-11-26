/**
 * Copyright QuietReplay contributors.
 * SPDX-License-Identifier: MIT
 */

/**
 * Injected into ISOLATED world. Receives MAIN CustomEvents and forwards to SW.
 */
import {
  captureKey,
  describeClickTarget,
} from '../lib/describe-target';
import { cssPath } from '../lib/selector';

export default defineUnlistedScript(() => {
  const w = window as Window & {
    __quietreplay_bridge?: boolean;
    __quietreplay_stop_bridge?: () => void;
    __quietreplay_bridge_cfg?: {
      eventName: string;
      token: string;
      tabId: number;
    };
  };
  w.__quietreplay_stop_bridge?.();
  if (w.__quietreplay_bridge) return;
  const cfg = w.__quietreplay_bridge_cfg;
  if (!cfg?.eventName || !cfg?.token) return;

  const abort = new AbortController();

  document.addEventListener(cfg.eventName, ((ev: Event) => {
    const ce = ev as CustomEvent;
    const detail = ce.detail as { token?: string } & Record<string, unknown>;
    if (!detail || detail.token !== cfg.token) return;
    void chrome.runtime.sendMessage({
      type: 'qr:event',
      tabId: cfg.tabId,
      event: detail,
    });
  }) as EventListener, { signal: abort.signal });

  document.addEventListener(
    'click',
    (ev) => {
      const t = ev.target as Element | null;
      if (!t) return;
      const input =
        t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement
          ? t
          : t.closest('input, textarea, select');
      const control =
        input instanceof HTMLInputElement ||
        input instanceof HTMLTextAreaElement ||
        input instanceof HTMLSelectElement
          ? input
          : null;
      void chrome.runtime.sendMessage({
        type: 'qr:event',
        tabId: cfg.tabId,
        event: {
          kind: 'click',
          t: Date.now(),
          selector: cssPath(t),
          text: describeClickTarget(t),
          inputType: control?.type,
          x: ev.clientX,
          y: ev.clientY,
        },
      });
    },
    { capture: true, signal: abort.signal },
  );

  document.addEventListener(
    'keydown',
    (ev) => {
      const t = ev.target as Element | null;
      const input =
        t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement
          ? t
          : null;
      const key = captureKey(ev.key, input?.type);
      if (!key) return;
      void chrome.runtime.sendMessage({
        type: 'qr:event',
        tabId: cfg.tabId,
        event: {
          kind: 'keydown',
          t: Date.now(),
          selector: cssPath(t),
          text: describeClickTarget(t),
          inputType: input?.type,
          key,
        },
      });
    },
    { capture: true, signal: abort.signal },
  );

  window.addEventListener(
    'load',
    () => {
      void chrome.runtime.sendMessage({
        type: 'qr:event',
        tabId: cfg.tabId,
        event: {
          kind: 'navigation',
          t: Date.now(),
          url: location.href,
          title: document.title,
        },
      });
    },
    { signal: abort.signal },
  );

  w.__quietreplay_stop_bridge = () => {
    abort.abort();
    w.__quietreplay_bridge = false;
    delete w.__quietreplay_stop_bridge;
  };
  w.__quietreplay_bridge = true;
});
