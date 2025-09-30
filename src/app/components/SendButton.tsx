"use client";

import React from "react";
import Image from "next/image";

interface SendButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function SendButton({ onClick, disabled = false }: SendButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-neutral-800/70 bg-iris/20 text-iris transition hover:border-iris/60 hover:bg-iris/30 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Send message"
    >
      <Image src="arrow.svg" alt="Send" width={16} height={16} />
    </button>
  );
}

export default SendButton;
