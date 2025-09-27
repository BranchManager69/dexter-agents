'use client';

import { useEffect, useState } from 'react';

type AccessLevel = 'guest' | 'pro' | 'holders';

export interface ToolCatalogEntry {
  name: string;
  description: string;
  access: AccessLevel;
  tags: string[];
}

interface ToolCatalogState {
  tools: ToolCatalogEntry[];
  loading: boolean;
  error: string | null;
}

const ACCESS_MAP: Record<string, AccessLevel> = {
  public: 'guest',
  guest: 'guest',
  free: 'guest',
  demo: 'guest',
  open: 'guest',
  pro: 'pro',
  paid: 'pro',
  managed: 'pro',
  holder: 'holders',
  holders: 'holders',
  premium: 'holders',
  internal: 'holders',
};

function normaliseAccess(value?: string): AccessLevel {
  if (!value) return 'guest';
  const key = value.toLowerCase();
  if (ACCESS_MAP[key]) return ACCESS_MAP[key];
  if (key.includes('holder')) return 'holders';
  if (key.includes('pro') || key.includes('paid')) return 'pro';
  return 'guest';
}

function extractDescription(tool: any): string {
  return (
    tool?.description ||
    tool?.summary ||
    tool?._meta?.summary ||
    tool?._meta?.description ||
    ''
  );
}

function extractTags(tool: any): string[] {
  if (Array.isArray(tool?._meta?.tags)) {
    return tool._meta.tags.filter((tag: any) => typeof tag === 'string');
  }
  return [];
}

function transformCatalog(raw: any): ToolCatalogEntry[] {
  const list = Array.isArray(raw?.tools)
    ? raw.tools
    : Array.isArray(raw)
    ? raw
    : [];

  return list
    .map((item: any) => {
      const name = typeof item?.name === 'string' ? item.name : null;
      if (!name) return null;
      return {
        name,
        description: extractDescription(item),
        access: normaliseAccess(item?._meta?.access || item?.access),
        tags: extractTags(item),
      } as ToolCatalogEntry;
    })
    .filter(Boolean) as ToolCatalogEntry[];
}

export function useToolCatalog(): ToolCatalogState {
  const [state, setState] = useState<ToolCatalogState>({ tools: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await fetch('/api/tools', { credentials: 'include' });
        const text = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch {
          data = { raw: text };
        }
        if (cancelled) return;
        if (!response.ok) {
          setState({ tools: [], loading: false, error: `${response.status} ${response.statusText}` });
          return;
        }
        const catalog = transformCatalog(data);
        setState({ tools: catalog, loading: false, error: null });
      } catch (error: any) {
        if (cancelled) return;
        setState({ tools: [], loading: false, error: error?.message || 'Failed to load tools' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
