export function sendTranscriptionDebug(payload: Record<string, any>) {
  if (typeof window === 'undefined') return;

  try {
    const body = JSON.stringify({
      ts: new Date().toISOString(),
      kind: 'transcription_debug',
      source: 'dexter-agents-ui',
      ...payload,
    });

    fetch('/api/transcription-debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body,
      keepalive: true,
    }).catch(() => {});
  } catch (error) {
    console.warn('[transcription-debug] failed to send', error);
  }
}
