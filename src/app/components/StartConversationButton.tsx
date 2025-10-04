"use client";

import React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

type StartConversationButtonProps = {
  onClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
};

export function StartConversationButton({ onClick, isLoading = false, disabled }: StartConversationButtonProps) {
  const isDisabled = disabled ?? isLoading;
  const LOOP_DURATION = 2.4;
  const PULSE_EASE: [number, number, number, number] = [0.6, 0, 0.4, 1];

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className="group relative mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-[#F2691B]/95 via-[#F4944E]/80 to-[#FDD5A3]/70 text-3xl text-white shadow-[0_0_45px_rgba(242,105,27,0.35)] focus:outline-none focus:ring-2 focus:ring-[#F2691B]/50 disabled:opacity-80"
      initial={{ scale: 0.99 }}
      animate={{ scale: [0.99, 1.04, 0.99] }}
      transition={{ duration: LOOP_DURATION * 1.5, repeat: Infinity, ease: PULSE_EASE }}
      whileHover={{ scale: 1.08 }}
      whileFocus={{ scale: 1.08 }}
    >
      <motion.span
        className="pointer-events-none absolute h-28 w-28 rounded-full bg-[#F2691B]/35 blur-3xl opacity-70"
        aria-hidden
        initial={{ opacity: 0.45, scale: 0.9 }}
        animate={{ opacity: [0.45, 0.72, 0.45], scale: [0.9, 1.06, 0.9] }}
        transition={{ duration: LOOP_DURATION, repeat: Infinity, ease: PULSE_EASE }}
      />
      <motion.span
        className="pointer-events-none absolute h-full w-full rounded-full border border-[#F4944E]/40"
        aria-hidden
        initial={{ opacity: 0.55, scale: 0.96 }}
        animate={{ opacity: [0.55, 0.82, 0.55], scale: [0.96, 1.05, 0.96] }}
        transition={{ duration: LOOP_DURATION, repeat: Infinity, ease: PULSE_EASE, delay: LOOP_DURATION / 4 }}
      />
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-full opacity-40 mix-blend-screen"
        aria-hidden
        style={{ background: "conic-gradient(from 0deg, rgba(255,255,255,0.15) 0deg, rgba(255,255,255,0.05) 120deg, rgba(255,255,255,0.2) 240deg, rgba(255,255,255,0.05) 360deg)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: LOOP_DURATION * 2.5, repeat: Infinity, ease: "linear" }}
      />
      <span className="relative flex h-16 w-16 items-center justify-center select-none">
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.span
              key="loading"
              className="flex h-full w-full items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <motion.svg
                viewBox="0 0 32 32"
                className="h-10 w-10 text-white"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{ duration: LOOP_DURATION, repeat: Infinity, ease: "linear" }}
              >
                <circle
                  cx="16"
                  cy="16"
                  r="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeOpacity="0.35"
                />
                <motion.circle
                  cx="16"
                  cy="16"
                  r="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="65"
                  strokeDashoffset="45"
                  initial={{ strokeDashoffset: 65 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: LOOP_DURATION, repeat: Infinity, ease: PULSE_EASE }}
                />
              </motion.svg>
            </motion.span>
          ) : (
            <motion.span
              key="logo"
              className="flex h-full w-full items-center justify-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Image
                src="/assets/logos/logo_orange.svg"
                alt=""
                role="presentation"
                width={64}
                height={64}
                priority={false}
              />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="sr-only">Start conversation</span>
    </motion.button>
  );
}

export default StartConversationButton;
