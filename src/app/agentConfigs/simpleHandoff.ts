import { RealtimeAgent } from '@openai/agents/realtime';
import { fetchPromptModule } from '@/app/lib/promptModules';

export async function buildHaikuWriterAgent(): Promise<RealtimeAgent> {
  const prompt = await fetchPromptModule('agent.haiku_writer.instructions');
  return new RealtimeAgent({
    name: 'haikuWriter',
    voice: 'sage',
    instructions: prompt.segment,
    handoffs: [],
    tools: [],
    handoffDescription: 'Agent that writes haikus',
  });
}

export async function buildGreeterAgent(): Promise<RealtimeAgent> {
  const prompt = await fetchPromptModule('agent.greeter.instructions');
  const haikuAgent = await buildHaikuWriterAgent();
  return new RealtimeAgent({
    name: 'greeter',
    voice: 'sage',
    instructions: prompt.segment,
    handoffs: [haikuAgent],
    tools: [],
    handoffDescription: 'Agent that greets the user',
  });
}

export async function loadSimpleHandoffScenario(): Promise<RealtimeAgent[]> {
  const greeter = await buildGreeterAgent();
  const haiku = await buildHaikuWriterAgent();
  return [greeter, haiku];
}
