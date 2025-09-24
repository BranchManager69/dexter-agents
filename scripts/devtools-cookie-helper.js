// Paste this into the proxy Chrome DevTools console after logging in.
(() => {
  const key = Object.keys(localStorage).find((k) =>
    k.startsWith('sb-qdgumpoqnthrjfmqziwm-') && k.endsWith('-auth-token'),
  );
  if (!key) {
    console.warn('No sb-... auth token found in localStorage.');
    return '';
  }
  const raw = localStorage.getItem(key);
  if (!raw) {
    console.warn('Auth token entry empty.');
    return '';
  }
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error('Failed to parse Supabase auth token JSON', err);
      return '';
    }
  }
  const access = parsed?.access_token ?? parsed?.currentSession?.access_token ?? parsed?.session?.access_token ?? parsed?.[0] ?? null;
  const refresh = parsed?.refresh_token ?? parsed?.currentSession?.refresh_token ?? parsed?.session?.refresh_token ?? parsed?.[1] ?? null;
  if (!access || !refresh) {
    console.warn('Missing access or refresh token in parsed payload.');
    return '';
  }
  const encode = (value) => encodeURIComponent(JSON.stringify(value));
  const header = `sb-qdgumpoqnthrjfmqziwm-auth-token=${encode([access, refresh, null, null, null])}; sb-qdgumpoqnthrjfmqziwm-refresh-token=${encode([refresh])}`;
  console.log(header);
  if (typeof copy === 'function') {
    try {
      copy(header);
      console.info('Cookie header copied to clipboard.');
    } catch (err) {
      console.warn('Failed to copy to clipboard automatically.', err);
    }
  }
  return header;
})();
