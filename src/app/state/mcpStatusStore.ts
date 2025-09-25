type McpState = 'loading' | 'user' | 'fallback' | 'guest' | 'none' | 'error';

export type McpStatusSnapshot = {
  state: McpState;
  label: string;
  detail?: string;
};

const DEFAULT_STATUS: McpStatusSnapshot = {
  state: 'loading',
  label: 'Checking…',
};

let current: McpStatusSnapshot = DEFAULT_STATUS;
const listeners = new Set<(status: McpStatusSnapshot) => void>();

function notify() {
  for (const listener of listeners) {
    listener(current);
  }
}

export function getMcpStatusSnapshot(): McpStatusSnapshot {
  return current;
}

export function subscribeMcpStatus(listener: (status: McpStatusSnapshot) => void) {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export function setMcpStatusSnapshot(status: McpStatusSnapshot) {
  current = status;
  notify();
}

function mapStateToSnapshot(state: string | null | undefined, detail?: string | null | undefined): McpStatusSnapshot {
  switch ((state || '').toLowerCase()) {
    case 'user':
      return { state: 'user', label: 'Personal wallets', detail: detail || undefined };
    case 'fallback':
      return { state: 'fallback', label: 'Shared fallback', detail: detail || 'Using shared bearer' };
    case 'guest':
      return { state: 'guest', label: 'Demo wallet', detail: detail || 'Guest session' };
    case 'none':
      return { state: 'none', label: 'Unavailable', detail: detail || 'No MCP token' };
    case 'error':
      return { state: 'error', label: 'Unavailable', detail: detail || 'MCP token error' };
    default:
      return DEFAULT_STATUS;
  }
}

export function updateMcpStatusFromHeaders(response: Response) {
  const state = response.headers.get('x-dexter-mcp-state');
  if (!state) return;
  const detail = response.headers.get('x-dexter-mcp-detail') || undefined;
  setMcpStatusSnapshot(mapStateToSnapshot(state, detail));
}

export function updateMcpStatusFromPayload(payload: { state?: string; label?: string; detail?: string }) {
  if (!payload) return;
  if (payload.state) {
    const snapshot = mapStateToSnapshot(payload.state, payload.detail);
    snapshot.label = payload.label ?? snapshot.label;
    setMcpStatusSnapshot(snapshot);
  }
}

export function setMcpStatusError(detail?: string) {
  setMcpStatusSnapshot({ state: 'error', label: 'Unavailable', detail: detail || undefined });
}

export function resetMcpStatus() {
  setMcpStatusSnapshot(DEFAULT_STATUS);
}
