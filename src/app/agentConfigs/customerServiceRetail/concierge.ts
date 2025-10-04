import { RealtimeAgent } from '@openai/agents/realtime';
import { fetchPromptModule } from '@/app/lib/promptModules';
import { CONFIG } from '@/app/config/env';

// IMPORTANT: Backend-native MCP tools are attached by Dexter API during realtime session creation.

export async function buildConciergeAgent(): Promise<RealtimeAgent> {
  const prompt = await fetchPromptModule('agent.concierge.instructions');

  return new RealtimeAgent({
    name: 'dexterVoice',
    voice: CONFIG.dexterVoicePrimary,
    handoffDescription:
      'Greets the caller, manages wallet context, surfaces market intel, and executes requests directly.',
    instructions: prompt.segment,
    tools: [],
    handoffs: [],
  });
}

export default buildConciergeAgent;
