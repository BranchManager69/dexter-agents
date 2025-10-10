"use client";

import { useEffect, useRef } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { sendTranscriptionDebug } from "@/app/lib/transcriptionDebug";

export function useHandleSessionHistory() {
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptToolNote,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItem,
  } = useTranscript();

  const { logServerEvent } = useEvent();

  const transcriptItemsRef = useRef(transcriptItems);
  const shouldLogServerSide = process.env.NEXT_PUBLIC_LOG_TRANSCRIPTS === 'true';
  const showDebugTranscript = process.env.NEXT_PUBLIC_DEBUG_TRANSCRIPT === 'true';
  const messageLogStateRef = useRef(new Map<string, string>());
  const toolLogSetRef = useRef(new Set<string>());
  const toolNoteIdMapRef = useRef(new Map<string, string>());
  const transcriptionLogSetRef = useRef(new Set<string>());

  useEffect(() => {
    transcriptItemsRef.current = transcriptItems;
  }, [transcriptItems]);

  const postToServerLog = (payload: Record<string, unknown>) => {
    if (!shouldLogServerSide || typeof window === 'undefined') return;
    try {
      const body = JSON.stringify({
        ...payload,
        ts: new Date().toISOString(),
      });

      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon('/api/transcript-log', blob);
      } else {
        fetch('/api/transcript-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch (error) {
      console.warn('Failed to forward transcript log:', error);
    }
  };

  const logMessageToServer = (itemId: string | undefined, role: string, text: string) => {
    if (!itemId) return;
    const trimmed = text?.trim();
    if (!trimmed) return;

    const previous = messageLogStateRef.current.get(itemId);
    if (previous === trimmed) return;

    messageLogStateRef.current.set(itemId, trimmed);
    postToServerLog({ kind: 'message', itemId, role, text: trimmed });
  };

  const logToolToServer = (toolId: string | undefined, entry: Record<string, unknown>) => {
    if (!toolId) return;
    if (toolLogSetRef.current.has(toolId)) return;
    toolLogSetRef.current.add(toolId);
    postToServerLog({ kind: 'tool', toolId, ...entry });
  };

  const hasRenderableContent = (value: any) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    return true;
  };

  const ensureToolNote = (
    rawToolId: string | undefined,
    toolName: string,
    status: 'IN_PROGRESS' | 'DONE',
    partialData?: Record<string, any>,
  ) => {
    const toolId = typeof rawToolId === 'string' && rawToolId.trim().length > 0
      ? rawToolId.trim()
      : undefined;

    if (!toolId) {
      // Without a stable tool identifier we can't safely track the note lifecycle.
      return undefined;
    }

    let synthesizedId = toolNoteIdMapRef.current.get(toolId);

    if (!synthesizedId) {
      synthesizedId = `tool-${toolId}`;
      toolNoteIdMapRef.current.set(toolId, synthesizedId);
    }

    const existing = transcriptItemsRef.current.find((item) => item.itemId === synthesizedId);
    const existingData = (existing?.data ?? {}) as Record<string, any>;
    const incomingData = partialData && Object.keys(partialData).length > 0 ? partialData : undefined;
    const mergedData = incomingData ? { ...existingData, ...incomingData } : existingData;
    const normalizedData = Object.keys(mergedData).length > 0 ? mergedData : undefined;

    if (!existing) {
      addTranscriptToolNote(toolName, normalizedData, { itemId: synthesizedId, status });
    } else {
      updateTranscriptItem(synthesizedId, {
        status,
        data: normalizedData,
        title: toolName || existing.title,
      });
    }

    return synthesizedId;
  };

  const ensureUserTranscriptMessage = (itemId: string, initialText = "") => {
    const existing = transcriptItemsRef.current.find(
      (item) => item.itemId === itemId && item.type === "MESSAGE",
    );

    if (!existing) {
      addTranscriptMessage(itemId, "user", initialText);
    }
  };

  /* ----------------------- helpers ------------------------- */

  const extractMessageText = (content: any[] = []): string => {
    if (!Array.isArray(content)) return "";

    return content
      .map((c) => {
        if (!c || typeof c !== "object") return "";
        if (c.type === "input_text") return c.text ?? "";
        if (c.type === "audio") return c.transcript ?? "";
        if (c.type === "input_audio") return c.transcript ?? "";
        return "";
      })
      .filter(Boolean)
      .join("\n");
  };

  const extractFunctionCallByName = (name: string, content: any[] = []): any => {
    if (!Array.isArray(content)) return undefined;
    return content.find((c: any) => c.type === 'function_call' && c.name === name);
  };

  const maybeParseJson = (val: any) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        console.warn('Failed to parse JSON:', val);
        return val;
      }
    }
    return val;
  };

  const extractLastAssistantMessage = (history: any[] = []): any => {
    if (!Array.isArray(history)) return undefined;
    return history.reverse().find((c: any) => c.type === 'message' && c.role === 'assistant');
  };

  const extractModeration = (obj: any) => {
    if ('moderationCategory' in obj) return obj;
    if ('outputInfo' in obj) return extractModeration(obj.outputInfo);
    if ('output' in obj) return extractModeration(obj.output);
    if ('result' in obj) return extractModeration(obj.result);
  };

  // Temporary helper until the guardrail_tripped event includes the itemId in the next version of the SDK
  const sketchilyDetectGuardrailMessage = (text: string) => {
    return text.match(/Failure Details: (\{.*?\})/)?.[1];
  };

  /* ----------------------- event handlers ------------------------- */

  function handleAgentToolStart(details: any, _agent: any, functionCall: any) {
    const lastFunctionCall = extractFunctionCallByName(functionCall.name, details?.context?.history);
    const function_name = lastFunctionCall?.name;
    const function_args = lastFunctionCall?.arguments;

    if (showDebugTranscript) {
      addTranscriptBreadcrumb(
        `function call: ${function_name}`,
        function_args
      );
    }
    const displayName = function_name ?? functionCall?.name ?? 'tool_call';
    const parsedArgs = maybeParseJson(function_args ?? functionCall?.arguments ?? {});
    // Start a TOOL_NOTE in progress so UI shows a live "processing" chip
    const toolItemId = `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    addTranscriptToolNote(displayName, parsedArgs, { itemId: toolItemId, status: 'IN_PROGRESS' });
    // Stash the synthetic tool item id on the functionCall so end can resolve it
    (functionCall as any).__transcript_tool_item_id = toolItemId;
  }
  function handleAgentToolEnd(details: any, _agent: any, _functionCall: any, result: any) {
    const lastFunctionCall = extractFunctionCallByName(_functionCall.name, details?.context?.history);
    if (showDebugTranscript) {
      addTranscriptBreadcrumb(
        `function call result: ${lastFunctionCall?.name}`,
        maybeParseJson(result)
      );
    }
    // Finalize the in-progress TOOL_NOTE if we created one at start
    const noteId = (_functionCall as any).__transcript_tool_item_id as string | undefined;
    if (noteId && typeof noteId === 'string') {
      try {
        updateTranscriptItem(noteId, { status: 'DONE' });
      } catch {}
    }
  }

  function handleHistoryAdded(item: any) {
    console.log("[handleHistoryAdded] ", item);
    if (!item || item.type !== 'message') return;

    const { itemId, role, content = [] } = item;
    if (itemId && role) {
      const isUser = role === "user";
      let text = extractMessageText(content);

      if (isUser && !text) {
        text = "[Transcribing...]";
      }

      // If the guardrail has been tripped, this message is a message that gets sent to the 
      // assistant to correct it, so we add it as a breadcrumb instead of a message.
      const guardrailMessage = sketchilyDetectGuardrailMessage(text);
      if (guardrailMessage) {
        const failureDetails = JSON.parse(guardrailMessage);
        addTranscriptBreadcrumb('Output Guardrail Active', { details: failureDetails });
      } else {
        addTranscriptMessage(itemId, role, text);
        logMessageToServer(itemId, role, text);
      }
    }
  }

  function handleHistoryUpdated(items: any[]) {
    console.log("[handleHistoryUpdated] ", items);
    items.forEach((item: any) => {
      if (!item || item.type !== 'message') return;

      const { itemId, content = [] } = item;

      const text = extractMessageText(content);

      if (text) {
        updateTranscriptMessage(itemId, text, false);
        logMessageToServer(itemId, item.role ?? 'assistant', text);
      }
    });
  }

  function handleTranscriptionDelta(
    item: any,
    role: 'user' | 'assistant' = 'assistant',
  ) {
    const itemId = item.item_id;
    const deltaText = item.delta || "";
    if (itemId) {
      if (role === 'user') {
        ensureUserTranscriptMessage(itemId);
      }
      updateTranscriptMessage(itemId, deltaText, true);

      const logKey = `${role}:${itemId}`;
      if (deltaText && !transcriptionLogSetRef.current.has(logKey)) {
        transcriptionLogSetRef.current.add(logKey);
        sendTranscriptionDebug({
          event: 'transcription_delta',
          role,
          itemId,
          preview: deltaText.slice(0, 80),
        });
      }
    }
  }

  function handleTranscriptionCompleted(
    item: any,
    role: 'user' | 'assistant' = 'assistant',
  ) {
    // History updates don't reliably end in a completed item, 
    // so we need to handle finishing up when the transcription is completed.
    const itemId = item.item_id || item.id || item?.message_id;
    const finalTranscript =
      typeof item.transcript === 'string' && item.transcript.trim().length > 0
        ? item.transcript
        : (() => {
            // Some transports tuck the transcript inside a content array
            const content = Array.isArray(item?.content) ? item.content : [];
            for (const c of content) {
              if (c && typeof c === 'object' && (c.type === 'input_audio' || c.type === 'audio')) {
                const t = (c as any).transcript;
                if (typeof t === 'string' && t.trim().length > 0) return t;
              }
            }
            return "[inaudible]";
          })();
    if (itemId) {
      if (role === 'user') {
        ensureUserTranscriptMessage(itemId);
      }
      updateTranscriptMessage(itemId, finalTranscript, false);
      const transcriptItem = transcriptItemsRef.current.find((i) => i.itemId === itemId);
      updateTranscriptItem(itemId, { status: 'DONE' });

      logMessageToServer(itemId, role, finalTranscript);
      sendTranscriptionDebug({
        event: 'transcription_completed',
        role,
        itemId,
        text: finalTranscript,
      });

      // If guardrailResult still pending, mark PASS.
      if (transcriptItem?.guardrailResult?.status === 'IN_PROGRESS') {
        updateTranscriptItem(itemId, {
          guardrailResult: {
            status: 'DONE',
            category: 'NONE',
            rationale: '',
          },
        });
      }
    }
  }

  function handleGuardrailTripped(details: any, _agent: any, guardrail: any) {
    console.log("[guardrail tripped]", details, _agent, guardrail);
    const moderation = extractModeration(guardrail.result.output.outputInfo);
    logServerEvent({ type: 'guardrail_tripped', payload: moderation });

    // find the last assistant message in details.context.history
    const lastAssistant = extractLastAssistantMessage(details?.context?.history);

    if (lastAssistant && moderation) {
      const category = moderation.moderationCategory ?? 'NONE';
      const rationale = moderation.moderationRationale ?? '';
      const offendingText: string | undefined = moderation?.testText;

      updateTranscriptItem(lastAssistant.itemId, {
        guardrailResult: {
          status: 'DONE',
          category,
          rationale,
          testText: offendingText,
        },
      });
    }
  }

  function handleMcpToolCallStarted(toolCall: any) {
    if (!toolCall) return;
    const toolName = toolCall?.name ?? 'mcp_tool';
    const toolId = typeof toolCall?.id === 'string' ? toolCall.id : undefined;
    const parsedArgs = maybeParseJson(toolCall?.arguments ?? {});
    const noteData: Record<string, any> = {};

    if (hasRenderableContent(parsedArgs)) {
      noteData.arguments = parsedArgs;
    }

    ensureToolNote(toolId, toolName, 'IN_PROGRESS', noteData);
  }

  function handleMcpToolCallCompleted(_context: any, _agent: any, toolCall: any) {
    const toolName = toolCall?.name ?? 'mcp_tool';
    const parsedArgs = maybeParseJson(toolCall?.arguments ?? {});
    const parsedOutput = toolCall?.output ? maybeParseJson(toolCall.output) : undefined;
    const noteData: Record<string, any> = {};

    if (hasRenderableContent(parsedArgs)) {
      noteData.arguments = parsedArgs;
    }

    if (hasRenderableContent(parsedOutput)) {
      noteData.output = parsedOutput;
    }

    const toolId = typeof toolCall?.id === 'string'
      ? toolCall.id
      : typeof toolCall?.call_id === 'string'
        ? toolCall.call_id
        : undefined;

    ensureToolNote(toolId, toolName, 'DONE', Object.keys(noteData).length ? noteData : undefined);

    // Compact breadcrumb to surface tool usage inline, in order
    if (showDebugTranscript) {
      addTranscriptBreadcrumb(`Used ${toolName}`);
    }

    const toolIdentifier = toolCall?.id || toolCall?.call_id || toolCall?.name;
    const safeOutput = parsedOutput && typeof parsedOutput === 'object'
      ? parsedOutput
      : parsedOutput;
    logToolToServer(toolIdentifier, {
      toolName,
      arguments: parsedArgs,
      output: safeOutput,
    });
  }

  function handleMcpToolArgumentsDone(itemId: string | undefined, rawArguments: string | undefined) {
    if (!itemId) return;
    const noteId = toolNoteIdMapRef.current.get(itemId);
    if (!noteId) return;

    const parsedArgs = maybeParseJson(rawArguments ?? {});
    if (!hasRenderableContent(parsedArgs)) return;

    const existing = transcriptItemsRef.current.find((item) => item.itemId === noteId);
    const existingData = (existing?.data ?? {}) as Record<string, any>;
    const nextData = { ...existingData, arguments: parsedArgs };

    updateTranscriptItem(noteId, {
      data: nextData,
    });
  }

  const handlersRef = useRef({
    handleAgentToolStart,
    handleAgentToolEnd,
    handleHistoryUpdated,
    handleHistoryAdded,
    handleTranscriptionDelta,
    handleTranscriptionCompleted,
    handleGuardrailTripped,
    handleMcpToolCallStarted,
    handleMcpToolCallCompleted,
    handleMcpToolArgumentsDone,
    logOutgoingUserText: (text: string) => {
      const trimmed = text?.trim();
      if (!trimmed) return;
      const syntheticId = `outbound-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      logMessageToServer(syntheticId, 'user', trimmed);
    },
  });

  return handlersRef;
}
