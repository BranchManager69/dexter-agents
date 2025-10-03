import type { RealtimeAgent } from '@openai/agents/realtime';

import { buildConciergeAgent } from './concierge';

export async function loadDexterTradingScenario(): Promise<RealtimeAgent[]> {
  const concierge = await buildConciergeAgent();
  return [concierge];
}

// Name of the company represented by this agent set. Used by guardrails
export const dexterTradingCompanyName = 'Dexter Trading Desk';

export const defaultAgentSetKey = 'dexterTrading';

export default loadDexterTradingScenario;
