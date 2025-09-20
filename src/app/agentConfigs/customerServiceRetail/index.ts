import type { RealtimeAgent } from '@openai/agents/realtime';

import portfolioAgent from './portfolio';
import tradeExecutionAgent from './trading';
import marketIntelAgent from './intel';
import humanDeskAgent from './human';

// Wire mutual handoffs so each specialist can escalate or bounce back when needed.
(portfolioAgent.handoffs as any).push(tradeExecutionAgent, marketIntelAgent, humanDeskAgent);
(tradeExecutionAgent.handoffs as any).push(portfolioAgent, marketIntelAgent, humanDeskAgent);
(marketIntelAgent.handoffs as any).push(portfolioAgent, tradeExecutionAgent, humanDeskAgent);
(humanDeskAgent.handoffs as any).push(portfolioAgent, tradeExecutionAgent, marketIntelAgent);

export const dexterTradingScenario: RealtimeAgent[] = [
  portfolioAgent,
  tradeExecutionAgent,
  marketIntelAgent,
  humanDeskAgent,
];

// Name of the company represented by this agent set. Used by guardrails
export const dexterTradingCompanyName = 'Dexter Trading Desk';

export const allAgentSets: Record<string, RealtimeAgent[]> = {
  dexterTrading: dexterTradingScenario,
};

export const defaultAgentSetKey = 'dexterTrading';

export default dexterTradingScenario;
