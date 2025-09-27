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
  extraContext?: Record<string, any>;
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
      default: {
        logServerEvent(event);
        break;
      } 
    }
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
    if (sessionRef.current) {
      // Log server errors
      sessionRef.current.on("error", (...args: any[]) => {
        logServerEvent({
          type: "error",
          message: args[0],
        });
      });

      // history events
      sessionRef.current.on("agent_handoff", handleAgentHandoff);
      sessionRef.current.on("agent_tool_start", historyHandlersRef.current.handleAgentToolStart);
      sessionRef.current.on("agent_tool_end", (context: any, agent: any, tool: any, result: any) => {
        historyHandlersRef.current.handleAgentToolEnd(context, agent, tool, result);
        sessionRef.current?.transport.sendEvent({ type: 'response.create' } as any);
      });
      sessionRef.current.on("history_updated", historyHandlersRef.current.handleHistoryUpdated);
      sessionRef.current.on("history_added", historyHandlersRef.current.handleHistoryAdded);
      sessionRef.current.on("guardrail_tripped", historyHandlersRef.current.handleGuardrailTripped);
      sessionRef.current.on("mcp_tool_call_completed", (context: any, agent: any, toolCall: any) => {
        historyHandlersRef.current.handleMcpToolCallCompleted(context, agent, toolCall);
        sessionRef.current?.transport.sendEvent({ type: 'response.create' } as any);
      });

      // additional transport events
      sessionRef.current.on("transport_event", handleTransportEvent);
    }
  }, [sessionRef.current]);

  const connect = useCallback(
    async ({
      getEphemeralKey,
      initialAgents,
      audioElement,
      extraContext,
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
        context: extraContext ?? {},
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
