export function sendTranscriptionDebug(payload: Record<string, any>) {
  if (typeof window === 'undefined') return;

  try {
    const body = JSON.stringify({
      ts: new Date().toISOString(),
      kind: 'transcription_debug',
      source: 'dexter-agents-ui',
      ...payload,
    });

    const blob = new Blob([body], { type: 'application/json' });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/transcription-debug', blob);
    } else {
      fetch('/api/transcription-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch (error) {
    console.warn('[transcription-debug] failed to send', error);
  }
}
