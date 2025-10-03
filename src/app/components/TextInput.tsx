"use client";

import React, { useEffect, useRef } from "react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function TextInput({
  value,
  onChange,
  onSubmit,
  placeholder = "Ask Dexter anything",
  disabled = false,
  autoFocus = false,
}: TextInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      placeholder={placeholder}
      className="flex-1 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-4 py-2.5 text-base text-neutral-100 outline-none transition-all duration-150 ease-out focus:border-flux/50 focus:ring-2 focus:ring-flux/30 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

export default TextInput;
