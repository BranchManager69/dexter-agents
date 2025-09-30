"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";

interface InputBarProps {
  userText: string;
  setUserText: (text: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
}

export function InputBar({
  userText,
  setUserText,
  onSendMessage,
  canSend,
}: InputBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Autofocus on text box input when canSend becomes true
  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  return (
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
        placeholder="Type a question or directive"
      />
      <button
        onClick={onSendMessage}
        disabled={!canSend || !userText.trim()}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-800/70 bg-iris/20 text-iris transition hover:border-iris/60 hover:bg-iris/30 disabled:opacity-50"
      >
        <Image src="arrow.svg" alt="Send" width={20} height={20} />
      </button>
    </div>
  );
}

export default InputBar;
