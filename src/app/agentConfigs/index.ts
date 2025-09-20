import { customerServiceRetailScenario } from './customerServiceRetail';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  customerServiceRetail: customerServiceRetailScenario,
};

export const defaultAgentSetKey = 'customerServiceRetail';
