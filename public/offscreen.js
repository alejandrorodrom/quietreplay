/* QuietReplay offscreen recorder — plain script (no modules) for MV3 reliability. */
(() => {
  const CHUNK = 32768;
  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }

  let mediaRecorder = null;
  let headerChunk = null;
  let clusterChunks = [];
  let stream = null;
  let audioCtx = null;

  const TIMESLICE_MS = 2000;

  function pickMimeType() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return 'video/webm';
  }

  function resetSegments() {
    headerChunk = null;
    clusterChunks = [];
  }

  function assembleBlob(mimeType) {
    if (!headerChunk) return null;
    return new Blob([headerChunk, ...clusterChunks], { type: mimeType });
  }

  function stopTracks() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    if (audioCtx) {
      try {
        void audioCtx.close();
      } catch {
        /* ignore */
      }
      audioCtx = null;
    }
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.target && msg.target !== 'offscreen') return;

    if (msg?.type === 'qr:video-ping') {
      sendResponse({ ok: true });
      return false;
    }

    if (msg?.type === 'qr:video-start') {
      void (async () => {
        try {
          stopTracks();
          resetSegments();
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            try {
              mediaRecorder.stop();
            } catch {
              /* ignore */
            }
          }
          mediaRecorder = null;

          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: msg.streamId,
              },
            },
            video: {
              mandatory: {
                chromeMediaSource: 'tab',
                chromeMediaSourceId: msg.streamId,
              },
            },
          });

          audioCtx = new AudioContext();
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(audioCtx.destination);

          const mimeType = pickMimeType();
          mediaRecorder = new MediaRecorder(stream, { mimeType });
          mediaRecorder.ondataavailable = (ev) => {
            if (!ev.data || ev.data.size === 0) return;
            if (!headerChunk) {
              headerChunk = ev.data;
              return;
            }
            clusterChunks.push(ev.data);
          };
          mediaRecorder.start(TIMESLICE_MS);
          sendResponse({ ok: true });
        } catch (err) {
          stopTracks();
          sendResponse({
            ok: false,
            error: err && err.message ? err.message : String(err),
          });
        }
      })();
      return true;
    }

    if (msg?.type === 'qr:video-stop') {
      void (async () => {
        const mimeType =
          (mediaRecorder && mediaRecorder.mimeType) || 'video/webm';
        await new Promise((resolve) => {
          if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            resolve();
            return;
          }
          mediaRecorder.addEventListener('stop', () => resolve(), {
            once: true,
          });
          try {
            mediaRecorder.requestData();
          } catch {
            /* ignore */
          }
          mediaRecorder.stop();
        });
        stopTracks();
        const blob = assembleBlob(mimeType);
        mediaRecorder = null;
        if (!blob || blob.size === 0) {
          resetSegments();
          sendResponse({ ok: false, error: 'empty-recording' });
          return;
        }
        const base64 = arrayBufferToBase64(await blob.arrayBuffer());
        resetSegments();
        sendResponse({
          ok: true,
          base64,
          mimeType: blob.type || 'video/webm',
        });
      })();
      return true;
    }

    if (msg?.type === 'qr:video-close') {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch {
          /* ignore */
        }
      }
      mediaRecorder = null;
      stopTracks();
      resetSegments();
      sendResponse({ ok: true });
    }
  });
})();
