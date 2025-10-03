import type { RealtimeAgent } from '@openai/agents/realtime';
import { loadDexterTradingScenario, defaultAgentSetKey } from './customerServiceRetail';

export type AgentScenarioLoader = () => Promise<RealtimeAgent[]>;

export const scenarioLoaders: Record<string, AgentScenarioLoader> = {
  dexterTrading: loadDexterTradingScenario,
};

export { defaultAgentSetKey };
