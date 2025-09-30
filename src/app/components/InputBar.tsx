"use client";

import React from "react";
import TextInput from "./TextInput";
import SendButton from "./SendButton";

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
  const canSubmit = canSend && userText.trim().length > 0;

  return (
    <div className="flex flex-shrink-0 items-center gap-3 border-t border-neutral-800/70 bg-surface-base/90 px-6 py-4">
      <TextInput
        value={userText}
        onChange={setUserText}
        onSubmit={onSendMessage}
        disabled={!canSend}
        autoFocus={canSend}
      />
      <SendButton onClick={onSendMessage} disabled={!canSubmit} />
    </div>
  );
}

export default InputBar;
