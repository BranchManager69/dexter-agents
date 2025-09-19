const pickEnv = (
  keys: string[],
  fallback: string,
): string => {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) return value.trim();
  }
  return fallback;
};

export const MODEL_IDS = {
  realtime: pickEnv(
    ['NEXT_PUBLIC_OPENAI_REALTIME_MODEL', 'OPENAI_REALTIME_MODEL'],
    'gpt-realtime',
  ),
  transcription: pickEnv(
    ['NEXT_PUBLIC_OPENAI_TRANSCRIPTION_MODEL', 'OPENAI_TRANSCRIPTION_MODEL'],
    'gpt-4o-mini-transcribe',
  ),
  supervisor: pickEnv(
    ['NEXT_PUBLIC_OPENAI_SUPERVISOR_MODEL', 'OPENAI_SUPERVISOR_MODEL'],
    'gpt-4.1',
  ),
  guardrail: pickEnv(
    ['NEXT_PUBLIC_OPENAI_GUARDRAIL_MODEL', 'OPENAI_GUARDRAIL_MODEL'],
    'gpt-4o-mini',
  ),
} as const;

export type ModelKey = keyof typeof MODEL_IDS;

export const getModelId = (key: ModelKey): string => MODEL_IDS[key];
