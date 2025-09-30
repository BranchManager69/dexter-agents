"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { GuardrailChip } from "./GuardrailChip";

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
              Start typing to begin, or try one of these:
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
            const containerClasses = `flex flex-col ${
              isUser ? "items-end" : "items-start"
            }`;
            const bubbleBase = `max-w-xl rounded-2xl border border-neutral-800/60 px-5 py-4 ${
              isUser
                ? "bg-iris/15 text-neutral-100"
                : "bg-surface-glass/60 text-neutral-200"
            }`;
            const isBracketedMessage =
              title.startsWith("[") && title.endsWith("]");
            const messageStyle = isBracketedMessage
              ? 'italic text-gray-400'
              : '';
            const displayTitle = isBracketedMessage
              ? title.slice(1, -1)
              : title;

            return (
              <div key={itemId} className={containerClasses}>
                <div className="max-w-xl">
                  <div
                    className={`${bubbleBase} rounded-3xl ${guardrailResult ? "rounded-b-none" : ""}`}
                  >
                    <div
                      className={`text-[10px] font-mono uppercase tracking-[0.28em] ${
                        isUser ? "text-neutral-400" : "text-neutral-500"
                      }`}
                    >
                      {timestamp}
                    </div>
                    <div className={`mt-2 whitespace-pre-wrap leading-relaxed ${messageStyle}`}>
                      <ReactMarkdown>{displayTitle}</ReactMarkdown>
                    </div>
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
            const hasDetails = data && Object.keys(data).length > 0;
            return (
              <div
                key={itemId}
                className="flex flex-col items-start text-[11px] text-neutral-400"
              >
                <div
                  className={`flex items-center gap-2 rounded-full border border-neutral-800/50 bg-surface-glass/60 px-3 py-1 font-mono uppercase tracking-[0.28em] text-[10px] text-neutral-300 ${
                    hasDetails ? "cursor-pointer hover:border-flux/60" : ""
                  }`}
                  onClick={() => hasDetails && toggleTranscriptItemExpand(itemId)}
                >
                  <span className="text-[9px] text-flux">•</span>
                  <span>Tool</span>
                  <span className="tracking-normal text-neutral-200">{title}</span>
                  {hasDetails && (
                    <span
                      className={`ml-1 select-none text-neutral-500 transition-transform duration-200 ${
                        expanded ? "rotate-90" : "rotate-0"
                      }`}
                    >
                      ▶
                    </span>
                  )}
                </div>
                {expanded && hasDetails && (
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
