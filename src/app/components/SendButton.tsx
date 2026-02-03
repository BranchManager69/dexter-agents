"use client";

import React from "react";

interface SendButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const SendArrow = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M5 12h14M13 6l6 6-6 6"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function SendButton({ onClick, disabled = false }: SendButtonProps) {
  return (
    <button
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      disabled={disabled}
      className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF8A3C] via-[#F26B1A] to-[#E85A0C] text-white shadow-[0_4px_20px_rgba(242,107,26,0.5)] transition-all duration-200 ease-out hover:scale-105 hover:shadow-[0_6px_28px_rgba(242,107,26,0.65)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBD0A4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-[0_4px_20px_rgba(242,107,26,0.5)]"
      aria-label="Send message"
    >
      <SendArrow className="h-5 w-5 translate-x-[1px]" />
    </button>
  );
}

export default SendButton;
