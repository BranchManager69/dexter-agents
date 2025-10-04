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

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className="group relative mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-iris/80 via-flux/70 to-amber-300/70 text-3xl text-white shadow-[0_0_45px_rgba(94,234,212,0.35)] focus:outline-none focus:ring-2 focus:ring-flux/80 disabled:opacity-80"
      initial={{ scale: 0.98 }}
      animate={{ scale: 1.02 }}
      transition={{ duration: 3.2, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
      whileHover={{ scale: 1.08 }}
      whileFocus={{ scale: 1.08 }}
    >
      <motion.span
        className="pointer-events-none absolute h-28 w-28 rounded-full bg-iris/30 blur-3xl opacity-60"
        aria-hidden
        initial={{ opacity: 0.45, scale: 0.92 }}
        animate={{ opacity: [0.45, 0.75, 0.45], scale: [0.92, 1.05, 0.92] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        className="pointer-events-none absolute h-full w-full rounded-full border border-flux/30"
        aria-hidden
        initial={{ opacity: 0.55, scale: 0.98 }}
        animate={{ opacity: [0.55, 0.85, 0.55], scale: [0.98, 1.08, 0.98] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
      />
      <span className="relative flex h-12 w-12 items-center justify-center select-none">
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
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
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
                  strokeDasharray="75"
                  strokeDashoffset="45"
                  initial={{ strokeDashoffset: 75 }}
                  animate={{ strokeDashoffset: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
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
                width={48}
                height={48}
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
