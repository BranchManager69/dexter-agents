"use-client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { TranscriptItem } from "@/app/types";
import Image from "next/image";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { DownloadIcon, ClipboardCopyIcon } from "@radix-ui/react-icons";
import { GuardrailChip } from "./GuardrailChip";
import MessageMarkdown from "./MessageMarkdown";

export interface TranscriptProps {
  userText: string;
  setUserText: (val: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
  downloadRecording: () => void;
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  downloadRecording,
}: TranscriptProps) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const { loggedEvents } = useEvent();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const [isPinnedToBottom, setIsPinnedToBottom] = useState(true);
  const [justCopied, setJustCopied] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = useCallback(() => {
    const node = transcriptRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight });
  }, []);

  const handleScroll = useCallback(() => {
    const node = transcriptRef.current;
    if (!node) return;
    const { scrollTop, scrollHeight, clientHeight } = node;
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const isNearBottom = distanceFromBottom <= 64;
    setIsPinnedToBottom(isNearBottom);
  }, []);

  useEffect(() => {
    const node = transcriptRef.current;
    if (!node) return;
    const listener = () => handleScroll();
    node.addEventListener("scroll", listener, { passive: true });
    handleScroll();
    return () => node.removeEventListener("scroll", listener);
  }, [handleScroll]);

  useEffect(() => {
    const hasNewMessage = transcriptItems.length > prevLogs.length;
    const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
      const oldItem = prevLogs[index];
      return (
        oldItem &&
        (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
      );
    });

    if ((hasNewMessage || hasUpdatedMessage) && isPinnedToBottom) {
      scrollToBottom();
    }

    setPrevLogs(transcriptItems);
  }, [transcriptItems, prevLogs, isPinnedToBottom, scrollToBottom]);

  // Autofocus on text box input on load
  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  const handleSaveLog = () => {
    try {
      const artifact = {
        timestamp: new Date().toISOString(),
        source: "live",
        structured: {
          transcripts: transcriptItems,
          events: loggedEvents,
        },
        meta: {
          assistantMessageCount: transcriptItems.filter(
            (item) => item.type === "MESSAGE" && item.role === "assistant" && !item.isHidden,
          ).length,
          userMessageCount: transcriptItems.filter(
            (item) => item.type === "MESSAGE" && item.role === "user",
          ).length,
          generatedAt: new Date().toLocaleString(),
        },
      };

      const blob = new Blob([JSON.stringify(artifact, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `live-${artifact.timestamp.replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      requestAnimationFrame(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      });

      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    } catch (error) {
      console.error("Failed to save run artifact:", error);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 overflow-hidden border-b border-neutral-800/50 bg-surface-base/90 px-6 py-4 backdrop-blur">
          <span className="flex-shrink-0 font-display text-sm uppercase tracking-[0.28em] text-neutral-400">
            Conversation
          </span>
          <div className="flex min-w-0 flex-shrink gap-2">
            <button
              onClick={handleCopyTranscript}
              className="flex flex-shrink-0 items-center justify-center gap-x-1 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-2 py-2 text-xs uppercase tracking-[0.2em] text-neutral-300 transition hover:border-flux/50 hover:text-flux sm:px-3"
              title="Copy transcript"
            >
              <ClipboardCopyIcon />
              <span className="hidden sm:inline">{justCopied ? "Copied!" : "Copy"}</span>
            </button>
            <button
              onClick={downloadRecording}
              className="flex flex-shrink-0 items-center justify-center gap-x-1 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-2 py-2 text-xs uppercase tracking-[0.2em] text-neutral-300 transition hover:border-iris/50 hover:text-iris sm:px-3"
              title="Download audio recording"
            >
              <DownloadIcon />
              <span className="hidden md:inline">Download Audio</span>
              <span className="inline md:hidden">Audio</span>
            </button>
            <button
              onClick={handleSaveLog}
              className="flex flex-shrink-0 items-center justify-center gap-x-1 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-2 py-2 text-xs uppercase tracking-[0.2em] text-neutral-300 transition hover:border-amber-400/60 hover:text-amber-300 sm:px-3"
              title="Save conversation log"
            >
              <span className="text-lg leading-none">⬇</span>
              <span className="hidden sm:inline">{justSaved ? "Saved!" : "Save Log"}</span>
              <span className="inline sm:hidden">{justSaved ? "✓" : "Log"}</span>
            </button>
          </div>
        </div>

        {/* Transcript Content */}
        <div
          ref={transcriptRef}
          className="flex h-full flex-col gap-y-4 overflow-auto p-6"
        >
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
              const bubbleBase = `max-w-2xl rounded-2xl px-4 py-3`;
              const isBracketedMessage =
                title.startsWith("[") && title.endsWith("]");
              const messageStyle =
                isBracketedMessage
                  ? 'italic text-gray-400'
                  : '';
              const displayTitle = isBracketedMessage
                ? title.slice(1, -1)
                : title;
              const messageTextClass = isUser
                ? "text-neutral-50 font-medium"
                : "text-neutral-200";
              const timestampAlignment = isUser ? "self-end text-right" : "self-start text-left";

              return (
                <div key={itemId} className={containerClasses}>
                    <div className="max-w-2xl space-y-2">
                      <div
                        className={`${bubbleBase} rounded-3xl ${guardrailResult ? "rounded-b-none" : ""}`}
                      >
                      <div
                        className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${messageStyle} ${messageTextClass}`}
                      >
                        <MessageMarkdown>{displayTitle}</MessageMarkdown>
                      </div>
                    </div>
                    {guardrailResult && (
                      <div className="rounded-b-3xl border border-neutral-800/40 bg-surface-glass/50 px-4 py-3">
                        <GuardrailChip guardrailResult={guardrailResult} />
                      </div>
                    )}
                    <span className={`${timestampAlignment} text-[11px] font-sans text-neutral-500`}>
                      {timestamp}
                    </span>
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
              // Fallback if type is neither MESSAGE nor BREADCRUMB
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
      </div>

      <div className="flex flex-shrink-0 items-center gap-x-3 border-t border-neutral-800/70 bg-surface-base/90 px-6 py-4">
        <input
          ref={inputRef}
          type="text"
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canSend) {
              onSendMessage();
            }
          }}
          className="flex-1 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-4 py-2 text-sm text-neutral-100 outline-none transition focus:border-flux/50 focus:ring-2 focus:ring-flux/30"
          placeholder="Ask Dexter anything"
        />
        <button
          onClick={onSendMessage}
          disabled={!canSend || !userText.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-800/70 bg-iris/20 text-iris transition hover:border-iris/60 hover:bg-iris/30 disabled:opacity-50"
        >
          <Image src="arrow.svg" alt="Send" width={20} height={20} />
        </button>
      </div>
    </div>
  );
}

export default Transcript;
