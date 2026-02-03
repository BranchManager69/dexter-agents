/**
 * Configuration for OpenAI Realtime API sessions.
 *
 * These settings control how the Realtime API behaves and what events
 * it sends back to the client.
 */

/**
 * Event keys to include in OpenAI Realtime API session responses.
 *
 * IMPORTANT: Only use DOCUMENTED include keys from the OpenAI API reference.
 * Invalid keys can cause the entire session.update to be rejected.
 *
 * Per OpenAI docs (https://platform.openai.com/docs/guides/realtime-transcription):
 * - The transcription delta events (conversation.item.input_audio_transcription.delta)
 *   are sent AUTOMATICALLY when audio.input.transcription is configured.
 * - The include array is only for EXTRA fields, not for enabling event types.
 *
 * Documented valid keys:
 * - item.input_audio_transcription.logprobs: Include token probabilities in transcription events
 */
export const REALTIME_SESSION_INCLUDE_KEYS = [
  'item.input_audio_transcription.logprobs',
] as const;

export type RealtimeSessionIncludeKey = (typeof REALTIME_SESSION_INCLUDE_KEYS)[number];
