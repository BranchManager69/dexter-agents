'use client';

import { useEffect, useMemo, useState } from 'react';

interface McpTool {
  name?: string;
  description?: string;
  summary?: string;
  input_schema?: unknown;
  output_schema?: unknown;
  parameters?: unknown;
}

export default function ToolsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<unknown>(null);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [filter, setFilter] = useState('');
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/tools', { credentials: 'include' });
        const contentType = response.headers.get('content-type') || '';
        const text = await response.text();
        if (!response.ok) {
          if (active) {
            setError(`${response.status} ${response.statusText} — ${text.slice(0, 400)}`);
            setRaw(text);
          }
          return;
        }
        let data: unknown;
        try {
          data = contentType.includes('json') ? JSON.parse(text) : JSON.parse(text);
        } catch {
          data = { raw: text };
        }
        if (!active) return;
        setRaw(data);
        const arr: McpTool[] = Array.isArray((data as any)?.tools)
          ? ((data as any).tools as McpTool[])
          : Array.isArray(data)
          ? (data as McpTool[])
          : [];
        setTools(arr);
      } catch (err: any) {
        if (active) setError(err?.message || String(err));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return tools;
    return tools.filter((tool) => {
      const name = tool.name || '';
      const desc = tool.description || tool.summary || '';
      return name.toLowerCase().includes(query) || desc.toLowerCase().includes(query);
    });
  }, [tools, filter]);

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>MCP Tools</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Inspect hosted MCP tool definitions by hitting <code>/api/tools</code> via Dexter API.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <input
          style={{ flex: '1 1 auto', padding: '10px 12px', borderRadius: 6, border: '1px solid #2c3242', background: '#0b0c10', color: '#e6edf3' }}
          placeholder="Filter by name or description"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        />
        <button
          onClick={() => setShowRaw((v) => !v)}
          style={{ padding: '10px 14px', borderRadius: 6, border: '1px solid #2c3242', background: '#141820', color: '#e6edf3' }}
        >
          {showRaw ? 'Hide Raw' : 'Show Raw'}
        </button>
      </div>

      {loading && <div>Loading tools…</div>}
      {error && (
        <div style={{ color: '#ff9f9f', border: '1px solid #5a2323', background: '#2b0e0e', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          <div style={{ fontWeight: 600 }}>Error</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{error}</div>
          <div style={{ marginTop: 6, opacity: 0.8 }}>If you see 401/403, confirm the MCP token or session cookies.</div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && <div style={{ opacity: 0.8 }}>No tools found.</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {filtered.map((tool, index) => (
          <div key={`${tool.name || 'tool'}:${index}`} style={{ border: '1px solid #2c3242', borderRadius: 6, padding: 16, background: '#0b0c10' }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{tool.name || '(unnamed tool)'}</div>
            {tool.description || tool.summary ? (
              <div style={{ opacity: 0.85, marginBottom: 12 }}>{tool.description || tool.summary}</div>
            ) : null}
            <SchemaBlock title="Input Schema" value={(tool as any).input_schema ?? (tool as any).parameters} />
            <SchemaBlock title="Output Schema" value={(tool as any).output_schema} />
          </div>
        ))}
      </div>

      {showRaw && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>Raw response</div>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#0b0c10', color: '#9fb2c8', border: '1px solid #2c3242', borderRadius: 6, padding: 16 }}>
            {safeStringify(raw)}
          </pre>
        </div>
      )}
    </div>
  );
}

function SchemaBlock({ title, value }: { title: string; value: unknown }) {
  if (!value) return null;
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>{title}</div>
      <pre style={{ whiteSpace: 'pre-wrap', background: '#0b0c10', color: '#9fb2c8', border: '1px solid #2c3242', borderRadius: 6, padding: 12, maxHeight: 220, overflow: 'auto' }}>
        {safeStringify(value)}
      </pre>
    </div>
  );
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}
