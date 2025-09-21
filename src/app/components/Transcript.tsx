"use-client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
import Image from "next/image";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { DownloadIcon, ClipboardCopyIcon } from "@radix-ui/react-icons";
import { GuardrailChip } from "./GuardrailChip";

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
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const [justCopied, setJustCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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
  }, [transcriptItems]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800/50 bg-surface-base/90 px-6 py-4 backdrop-blur">
          <span className="font-display text-sm uppercase tracking-[0.28em] text-neutral-400">
            Conversation
          </span>
          <div className="flex gap-x-2">
            <button
              onClick={handleCopyTranscript}
              className="flex w-28 items-center justify-center gap-x-1 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-neutral-300 transition hover:border-flux/50 hover:text-flux"
            >
              <ClipboardCopyIcon />
              {justCopied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={downloadRecording}
              className="flex w-44 items-center justify-center gap-x-1 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-neutral-300 transition hover:border-iris/50 hover:text-iris"
            >
              <DownloadIcon />
              <span>Download Audio</span>
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
          placeholder="Enter directive or question"
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
