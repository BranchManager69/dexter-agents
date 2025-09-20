import { dexterTradingScenario } from './customerServiceRetail';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  dexterTrading: dexterTradingScenario,
};

export const defaultAgentSetKey = 'dexterTrading';
