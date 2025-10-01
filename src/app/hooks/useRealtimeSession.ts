import { useCallback, useRef, useState, useEffect } from 'react';
import {
  RealtimeSession,
  RealtimeAgent,
  OpenAIRealtimeWebRTC,
} from '@openai/agents/realtime';

import { audioFormatForCodec, applyCodecPreferences } from '../lib/codecUtils';
import { useEvent } from '../contexts/EventContext';
import { useHandleSessionHistory } from './useHandleSessionHistory';
import { SessionStatus } from '../types';
import { MODEL_IDS } from '../config/models';

export interface RealtimeSessionCallbacks {
  onConnectionChange?: (status: SessionStatus) => void;
  onAgentHandoff?: (agentName: string) => void;
}

export interface ConnectOptions {
  getEphemeralKey: () => Promise<string>;
  initialAgents: RealtimeAgent[];
  audioElement?: HTMLAudioElement;
  outputGuardrails?: any[];
}

export function useRealtimeSession(callbacks: RealtimeSessionCallbacks = {}) {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const [status, setStatus] = useState<
    SessionStatus
  >('DISCONNECTED');
  const { logClientEvent } = useEvent();

  const updateStatus = useCallback(
    (s: SessionStatus) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({}, s);
    },
    [callbacks],
  );

  const { logServerEvent } = useEvent();

  const historyHandlersRef = useHandleSessionHistory();

  // Track MCP chaining for backend-native tools
  const pendingMcpCallsRef = useRef<Set<string>>(new Set());
  const stepActiveRef = useRef<boolean>(false);
  const currentResponseIdRef = useRef<string | null>(null);

  function handleTransportEvent(event: any) {
    // Handle additional server events that aren't managed by the session
    switch (event.type) {
      case "conversation.item.input_audio_transcription.delta": {
        historyHandlersRef.current.handleTranscriptionDelta(event, 'user');
        break;
      }
      case "conversation.item.input_audio_transcription.completed": {
        historyHandlersRef.current.handleTranscriptionCompleted(event, 'user');
        break;
      }
      case "response.audio_transcript.done": {
        historyHandlersRef.current.handleTranscriptionCompleted(event, 'assistant');
        break;
      }
      case "response.audio_transcript.delta": {
        historyHandlersRef.current.handleTranscriptionDelta(event, 'assistant');
        break;
      }
      case "response.created": {
        // New step begins
        const rid = event?.response?.id || null;
        currentResponseIdRef.current = typeof rid === 'string' ? rid : null;
        pendingMcpCallsRef.current.clear();
        stepActiveRef.current = true;
        logServerEvent(event);
        break;
      }
      case "response.output_item.added": {
        // Collect MCP calls for this step
        const item = event?.item;
        if (item && item.type === 'mcp_call' && item.id) {
          pendingMcpCallsRef.current.add(item.id);
        }
        logServerEvent(event);
        break;
      }
      case "response.mcp_call.completed": {
        // Mark MCP call finished; if all done for this step and still active, advance
        const itemId = event?.item_id;
        if (itemId && pendingMcpCallsRef.current.has(itemId)) {
          pendingMcpCallsRef.current.delete(itemId);
          tryAdvanceAfterMcp();
        }
        logServerEvent(event);
        break;
      }
      case "response.output_item.done": {
        // Some transports signal completion here; honor both
        const item = event?.item;
        if (item && item.type === 'mcp_call' && item.id && pendingMcpCallsRef.current.has(item.id)) {
          pendingMcpCallsRef.current.delete(item.id);
          tryAdvanceAfterMcp();
        }
        logServerEvent(event);
        break;
      }
      case "response.done": {
        // If no MCP calls were queued this step, and we're still active, advance immediately
        const resp = event?.response;
        const rid = resp?.id || null;
        const outputs: any[] = Array.isArray(resp?.output) ? resp.output : [];
        const hasAssistantMessage = outputs.some((o) => o?.type === 'message');
        const hasMcpCalls = outputs.some((o) => o?.type === 'mcp_call');

        if (typeof rid === 'string') {
          currentResponseIdRef.current = rid;
        }

        if (hasAssistantMessage && !hasMcpCalls) {
          // Natural termination of step with an assistant message
          pendingMcpCallsRef.current.clear();
          stepActiveRef.current = false;
        } else if (!hasMcpCalls && stepActiveRef.current) {
          // No tools emitted and nothing pending — model likely wants to continue
          safeCreateFollowupResponse();
          stepActiveRef.current = false;
        }
        logServerEvent(event);
        break;
      }
      default: {
        logServerEvent(event);
        break;
      } 
    }
  }

  function safeCreateFollowupResponse() {
    try {
      sessionRef.current?.transport.sendEvent({ type: 'response.create' } as any);
    } catch { /* ignore */ }
  }

  function tryAdvanceAfterMcp() {
    if (!stepActiveRef.current) return;
    if (pendingMcpCallsRef.current.size > 0) return;
    // All MCP calls for this step have completed; request the next reasoning step
    safeCreateFollowupResponse();
    stepActiveRef.current = false;
  }

  const codecParamRef = useRef<string>(
    (typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('codec') ?? 'opus')
      : 'opus')
      .toLowerCase(),
  );

  // Wrapper to pass current codec param
  const applyCodec = useCallback(
    (pc: RTCPeerConnection) => applyCodecPreferences(pc, codecParamRef.current),
    [],
  );

  const handleAgentHandoff = (
    context: any,
    _fromAgent: any,
    toAgent: any,
  ) => {
    const directName = toAgent?.name;

    if (directName) {
      callbacks.onAgentHandoff?.(directName);
      return;
    }

    // Fallback: older SDK builds emit the transfer target in the history entry name.
    const history = context?.context?.history;
    const lastName = Array.isArray(history)
      ? history[history.length - 1]?.name
      : undefined;
    const inferredName = typeof lastName === 'string' && lastName.includes('transfer_to_')
      ? lastName.split('transfer_to_')[1]
      : undefined;

    if (inferredName) {
      callbacks.onAgentHandoff?.(inferredName);
    }
  };

  useEffect(() => {
    if (!sessionRef.current) return;
    const s = sessionRef.current;
    // Log server errors
    s.on("error", (...args: any[]) => {
      logServerEvent({ type: "error", message: args[0] });
    });

    // history events
    s.on("agent_handoff", handleAgentHandoff);
    s.on("agent_tool_start", historyHandlersRef.current.handleAgentToolStart);
    s.on("agent_tool_end", (context: any, agent: any, tool: any, result: any) => {
      historyHandlersRef.current.handleAgentToolEnd(context, agent, tool, result);
    });
    s.on("history_updated", historyHandlersRef.current.handleHistoryUpdated);
    s.on("history_added", historyHandlersRef.current.handleHistoryAdded);
    s.on("guardrail_tripped", historyHandlersRef.current.handleGuardrailTripped);
    s.on("mcp_tool_call_completed", (context: any, agent: any, toolCall: any) => {
      historyHandlersRef.current.handleMcpToolCallCompleted(context, agent, toolCall);
    });

    // additional transport events
    s.on("transport_event", handleTransportEvent);

    return () => {
      try { s.off?.("agent_handoff", handleAgentHandoff as any); } catch {}
      try { s.off?.("agent_tool_start", historyHandlersRef.current.handleAgentToolStart as any); } catch {}
      try { s.off?.("agent_tool_end", historyHandlersRef.current.handleAgentToolEnd as any); } catch {}
      try { s.off?.("history_updated", historyHandlersRef.current.handleHistoryUpdated as any); } catch {}
      try { s.off?.("history_added", historyHandlersRef.current.handleHistoryAdded as any); } catch {}
      try { s.off?.("guardrail_tripped", historyHandlersRef.current.handleGuardrailTripped as any); } catch {}
      try { s.off?.("mcp_tool_call_completed", historyHandlersRef.current.handleMcpToolCallCompleted as any); } catch {}
      try { s.off?.("transport_event", handleTransportEvent as any); } catch {}
      try { s.off?.("error", (() => {}) as any); } catch {}
    };
  }, [sessionRef.current]);

  const connect = useCallback(
    async ({
      getEphemeralKey,
      initialAgents,
      audioElement,
      outputGuardrails,
    }: ConnectOptions) => {
      if (sessionRef.current) return; // already connected

      updateStatus('CONNECTING');

      const ek = await getEphemeralKey();
      const rootAgent = initialAgents[0];

      // This lets you use the codec selector in the UI to force narrow-band (8 kHz) codecs to
      //  simulate how the voice agent sounds over a PSTN/SIP phone call.
      const codecParam = codecParamRef.current;
      const audioFormat = audioFormatForCodec(codecParam);

     sessionRef.current = new RealtimeSession(rootAgent, {
        transport: new OpenAIRealtimeWebRTC({
          audioElement,
          baseUrl:
            typeof window === 'undefined'
              ? `${process.env.NEXT_PUBLIC_SITE_URL || 'https://beta.dexter.cash'}/api/realtime/calls`
              : `${window.location.origin}/api/realtime/calls`,
          // Set preferred codec before offer creation
          changePeerConnection: async (pc: RTCPeerConnection) => {
            applyCodec(pc);
            return pc;
          },
        }),
        model: MODEL_IDS.realtime,
        config: {
          inputAudioFormat: audioFormat,
          outputAudioFormat: audioFormat,
          inputAudioTranscription: {
            model: MODEL_IDS.transcription,
          },
        },
        outputGuardrails: outputGuardrails ?? [],
        // The OpenAI Realtime API no longer accepts an arbitrary `context` payload,
        // so we avoid attaching it to prevent 400 Unknown parameter errors.
        automaticallyTriggerResponseForMcpToolCalls: true,
      });

      await sessionRef.current.connect({ apiKey: ek });
      updateStatus('CONNECTED');
    },
    [callbacks, updateStatus],
  );

  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    updateStatus('DISCONNECTED');
  }, [updateStatus]);

  const assertconnected = () => {
    if (!sessionRef.current) throw new Error('RealtimeSession not connected');
  };

  /* ----------------------- message helpers ------------------------- */

  const interrupt = useCallback(() => {
    sessionRef.current?.interrupt();
  }, []);
  
  const sendUserText = useCallback((text: string) => {
    assertconnected();
    historyHandlersRef.current.logOutgoingUserText?.(text);
    sessionRef.current!.sendMessage(text);
  }, [historyHandlersRef]);

  const sendEvent = useCallback((ev: any) => {
    sessionRef.current?.transport.sendEvent(ev);
  }, []);

  const mute = useCallback((m: boolean) => {
    sessionRef.current?.mute(m);
  }, []);

  const pushToTalkStart = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({ type: 'input_audio_buffer.clear' } as any);
  }, []);

  const pushToTalkStop = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current.transport.sendEvent({ type: 'input_audio_buffer.commit' } as any);
    sessionRef.current.transport.sendEvent({ type: 'response.create' } as any);
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
    pushToTalkStart,
    pushToTalkStop,
    interrupt,
  } as const;
}
