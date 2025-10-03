const API_ORIGIN = process.env.NEXT_PUBLIC_DEXTER_API_ORIGIN?.replace(/\/$/, '');

export type PromptModule = {
  slug: string;
  title: string | null;
  segment: string;
  version: number;
  updatedAt: string | null;
};

const cache = new Map<string, PromptModule>();

export async function fetchPromptModule(slug: string): Promise<PromptModule> {
  const trimmed = slug.trim();
  if (!trimmed) {
    throw new Error('Prompt module slug is required.');
  }
  if (cache.has(trimmed)) {
    return cache.get(trimmed)!;
  }
  if (!API_ORIGIN) {
    throw new Error('NEXT_PUBLIC_DEXTER_API_ORIGIN is not configured.');
  }
  const url = `${API_ORIGIN}/prompt-modules/${encodeURIComponent(trimmed)}`;
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to load prompt module: ${trimmed} (${response.status})`);
  }
  const data = await response.json().catch(() => null);
  const segment = data?.prompt?.segment;
  if (!data?.ok || typeof segment !== 'string') {
    throw new Error(`Prompt module response invalid for slug: ${trimmed}`);
  }
  const prompt: PromptModule = {
    slug: data.prompt.slug ?? trimmed,
    title: data.prompt.title ?? null,
    segment,
    version: Number(data.prompt.version ?? 0),
    updatedAt: typeof data.prompt.updatedAt === 'string' ? data.prompt.updatedAt : null,
  };
  cache.set(trimmed, prompt);
  return prompt;
}

export function clearPromptModuleCache() {
  cache.clear();
}
