import type { RealtimeAgent } from '@openai/agents/realtime';

import conciergeAgent from './concierge';

export const dexterTradingScenario: RealtimeAgent[] = [conciergeAgent];

// Name of the company represented by this agent set. Used by guardrails
export const dexterTradingCompanyName = 'Dexter Trading Desk';

export const allAgentSets: Record<string, RealtimeAgent[]> = {
  dexterTrading: dexterTradingScenario,
};

export const defaultAgentSetKey = 'dexterTrading';

export default dexterTradingScenario;
