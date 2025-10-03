"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { GuardrailChip } from "./GuardrailChip";
import { getToolNoteRenderer } from "./toolNotes/renderers";

interface TranscriptMessagesProps {
  hasActivatedSession?: boolean;
  onSendMessage?: (message: string) => void;
}

export function TranscriptMessages({
  hasActivatedSession,
  onSendMessage,
}: TranscriptMessagesProps = {}) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const showDebugPayloads = process.env.NEXT_PUBLIC_DEBUG_TRANSCRIPT === 'true';
  const [visibleTimestamps, setVisibleTimestamps] = useState<Record<string, boolean>>({});
  const timestampTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function scrollToBottom() {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }

  useEffect(() => {
    const hasNewMessage = transcriptItems.length > prevLogs.length;
    const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
      const oldItem = prevLogs[index];
      return (
        oldItem &&
        (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
      );
    });

    if (hasNewMessage || hasUpdatedMessage) {
      scrollToBottom();
    }

    setPrevLogs(transcriptItems);
  }, [transcriptItems, prevLogs]);

  useEffect(() => () => {
    timestampTimersRef.current.forEach((timer) => clearTimeout(timer));
    timestampTimersRef.current.clear();
  }, []);

  const revealTimestamp = (itemId: string) => {
    setVisibleTimestamps((prev) => ({ ...prev, [itemId]: true }));
    const existing = timestampTimersRef.current.get(itemId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setVisibleTimestamps((prev) => ({ ...prev, [itemId]: false }));
      timestampTimersRef.current.delete(itemId);
    }, 4000);
    timestampTimersRef.current.set(itemId, timer);
  };

  const handleBubbleInteract = (itemId: string) => {
    revealTimestamp(itemId);
  };

  // Only show empty state if there are no user or assistant messages (filter out debug/system items)
  const hasRealMessages = transcriptItems.some(item =>
    item.role === 'user' || item.role === 'assistant'
  );
  const showEmptyState = !hasActivatedSession && !hasRealMessages;

  const suggestedPrompts = [
    "What's trending on Pump.fun right now?",
    "Show me my wallet balance",
    "Help me find a promising new token",
  ];

  return (
    <div
      ref={transcriptRef}
      data-transcript-messages
      className="flex h-full flex-1 flex-col gap-y-4 overflow-auto p-6"
    >
      {showEmptyState && (
        <div className="flex h-full flex-1 items-center justify-center animate-in fade-in duration-500">
          <div className="max-w-md text-center">
            <p className="mb-6 text-sm text-neutral-400">
              Need a spark? Try one of these:
            </p>
            <div className="flex flex-col gap-2">
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => onSendMessage?.(prompt)}
                  className="rounded-md border border-neutral-800/60 bg-surface-glass/40 px-4 py-2.5 text-sm text-neutral-300 transition hover:border-flux/40 hover:bg-surface-glass/60 hover:text-flux"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {[...transcriptItems]
        .sort((a, b) => a.createdAtMs - b.createdAtMs)
        .map((item) => {
          const {
            itemId,
            type,
            role,
            data,
            expanded,
            timestamp,
            title = "",
            isHidden,
            guardrailResult,
          } = item;

          if (isHidden) {
            return null;
          }

          if (type === "MESSAGE") {
            const isUser = role === "user";
            const containerClasses = `group/message relative flex flex-col gap-1 ${
              isUser ? "items-end" : "items-start"
            }`;
            const bubbleBase = `relative max-w-xl rounded-3xl border border-neutral-800/50 px-5 py-3 shadow-sm transition-colors ${
              isUser
                ? "bg-gradient-to-r from-iris/30 via-iris/20 to-iris/10 text-neutral-100"
                : "bg-surface-glass/70 text-neutral-100"
            }`;
            const isBracketedMessage =
              title.startsWith("[") && title.endsWith("]");
            const messageStyle = isBracketedMessage ? "italic text-neutral-400" : "";
            const displayTitle = isBracketedMessage ? title.slice(1, -1) : title;

            const timestampVisible = Boolean(visibleTimestamps[itemId]);

            return (
              <div key={itemId} className={containerClasses}>
                <div className="max-w-xl">
                  <div
                    role="button"
                    tabIndex={0}
                    className={`${bubbleBase} ${guardrailResult ? "rounded-b-none" : ""}`}
                    onClick={() => handleBubbleInteract(itemId)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleBubbleInteract(itemId);
                      }
                    }}
                    onTouchStart={() => handleBubbleInteract(itemId)}
                  >
                    <span
                      className={`pointer-events-none absolute -top-5 ${
                        isUser ? "right-3" : "left-3"
                      } ${
                        timestampVisible
                          ? "flex"
                          : "hidden lg:group-hover/message:flex"
                      } rounded-md bg-neutral-900/90 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-neutral-200 shadow-lg transition-opacity duration-200`}
                    >
                      {timestamp}
                    </span>
                    <ReactMarkdown className={`whitespace-pre-wrap leading-relaxed ${messageStyle}`}>
                      {displayTitle}
                    </ReactMarkdown>
                  </div>
                  {guardrailResult && (
                    <div className="rounded-b-3xl border border-neutral-800/40 bg-surface-glass/50 px-4 py-3">
                      <GuardrailChip guardrailResult={guardrailResult} />
                    </div>
                  )}
                </div>
              </div>
            );
          } else if (type === "TOOL_NOTE") {
            const renderer = getToolNoteRenderer(title);
            if (renderer) {
              return (
                <div key={itemId} className="flex flex-col items-start text-[11px] text-neutral-400">
                  {renderer({
                    item,
                    isExpanded: expanded,
                    onToggle: () => toggleTranscriptItemExpand(itemId),
                    debug: showDebugPayloads,
                  })}
                </div>
              );
            }

            const hasDetails = data && Object.keys(data).length > 0;
            const canToggle = showDebugPayloads && hasDetails;
            return (
              <div key={itemId} className="flex flex-col items-start text-[11px] text-neutral-400">
                <div
                  className={`flex items-center gap-2 rounded-full border border-neutral-800/50 bg-surface-glass/60 px-3 py-1 font-mono uppercase tracking-[0.28em] text-[10px] text-neutral-300 ${
                    canToggle ? "cursor-pointer hover:border-flux/60" : ""
                  }`}
                  onClick={() => canToggle && toggleTranscriptItemExpand(itemId)}
                >
                  <span className="text-[9px] text-flux">•</span>
                  <span>Tool</span>
                  <span className="tracking-normal text-neutral-200">{title}</span>
                  {canToggle && (
                    <span
                      className={`ml-1 select-none text-neutral-500 transition-transform duration-200 ${
                        expanded ? "rotate-90" : "rotate-0"
                      }`}
                    >
                      ▶
                    </span>
                  )}
                </div>
                {showDebugPayloads && expanded && hasDetails && (
                  <pre className="mt-2 w-full max-w-xl break-words whitespace-pre-wrap rounded-md border border-neutral-800/40 bg-surface-glass/40 px-3 py-2 text-[11px] font-mono text-neutral-200">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                )}
              </div>
            );
          } else if (type === "BREADCRUMB") {
            return (
              <div
                key={itemId}
                className="flex flex-col items-start justify-start text-sm text-neutral-500"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-neutral-600">
                  {timestamp}
                </span>
                <div
                  className={`mt-1 flex items-center whitespace-pre-wrap font-mono text-xs text-neutral-300 ${
                    data ? "cursor-pointer hover:text-flux" : ""
                  }`}
                  onClick={() => data && toggleTranscriptItemExpand(itemId)}
                >
                  {data && (
                    <span
                      className={`mr-1 select-none font-mono text-neutral-500 transition-transform duration-200 ${
                        expanded ? "rotate-90" : "rotate-0"
                      }`}
                    >
                      ▶
                    </span>
                  )}
                  {title}
                </div>
                {expanded && data && (
                  <div className="text-left text-neutral-300">
                    <pre className="ml-1 mt-2 mb-2 break-words whitespace-pre-wrap rounded-md border border-neutral-800/40 bg-surface-glass/40 pl-3 text-[11px] font-mono text-neutral-200">
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div
                key={itemId}
                className="flex justify-center font-mono text-xs italic text-neutral-600"
              >
                Unknown item type: {type} <span className="ml-2 text-[10px]">{timestamp}</span>
              </div>
            );
          }
        })}
    </div>
  );
}

export default TranscriptMessages;
