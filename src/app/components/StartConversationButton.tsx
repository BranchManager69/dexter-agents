"use client";

import React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

type StartConversationButtonProps = {
  onClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
};

const LOOP_DURATION = 1.2;
const ARC_DURATION = 0.6;
const RING_CONFIGS = [
  { delay: 0, opacity: 0.8 },
  { delay: 0.09, opacity: 0.55 },
  { delay: 0.18, opacity: 0.35 },
];

const SPARK_CONFIGS = [
  { delay: 0, x: [0, 9, -5, 0], y: [0, -12, 6, 0] },
  { delay: 0.12, x: [0, -8, 5, 0], y: [0, -7, 7, 0] },
  { delay: 0.24, x: [0, 7, -6, 0], y: [0, 6, -9, 0] },
  { delay: 0.36, x: [0, -6, 10, 0], y: [0, 9, -4, 0] },
  { delay: 0.48, x: [0, 6, 4, 0], y: [0, -8, -7, 0] },
];

export function StartConversationButton({ onClick, isLoading = false, disabled }: StartConversationButtonProps) {
  const isDisabled = disabled ?? isLoading;
  const [isInteracting, setIsInteracting] = React.useState(false);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className="group relative mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-[#F2691B] text-3xl text-white shadow-[0_0_45px_rgba(242,105,27,0.45),inset_0_0_14px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#2F1300] focus:ring-[#FF7A2D]/60 disabled:opacity-80"
      initial={{ scale: 0.98 }}
      animate={{ scale: [0.98, 1.02, 0.99] }}
      transition={{ duration: LOOP_DURATION * 1.2, repeat: Infinity, ease: [0.6, 0, 0.4, 1] }}
      whileHover={{ scale: 1.12, rotate: 2, filter: "brightness(1.08)" }}
      whileFocus={{ scale: 1.12, rotate: 2, filter: "brightness(1.08)" }}
      onHoverStart={() => setIsInteracting(true)}
      onHoverEnd={() => setIsInteracting(false)}
      onFocus={() => setIsInteracting(true)}
      onBlur={() => setIsInteracting(false)}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full border border-[#C85618]/60" aria-hidden />

      {RING_CONFIGS.map(({ delay, opacity }, index) => (
        <motion.span
          key={`${isInteracting ? "fast" : "slow"}-${index}`}
          className="pointer-events-none absolute inset-0 rounded-full border border-[#FF9C46]"
          aria-hidden
          animate={{ scale: [0.45, 1.15], opacity: [opacity, 0] }}
          transition={{
            duration: isInteracting ? LOOP_DURATION * 0.6 : LOOP_DURATION,
            repeat: Infinity,
            ease: "easeOut",
            delay,
          }}
        />
      ))}

      <motion.span
        className="pointer-events-none absolute inset-0 rounded-full mix-blend-screen"
        aria-hidden
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0deg, rgba(255,246,236,0.7) 5deg, rgba(255,180,94,0.6) 35deg, rgba(242,105,27,0.9) 90deg, transparent 120deg)",
        }}
        animate={{
          rotate: 360,
          filter: ["hue-rotate(0deg)", "hue-rotate(15deg)", "hue-rotate(-10deg)", "hue-rotate(0deg)"],
          opacity: isInteracting ? 0.85 : 0.6,
        }}
        transition={{
          rotate: { duration: ARC_DURATION, repeat: Infinity, ease: "linear" },
          filter: { duration: ARC_DURATION * 2, repeat: Infinity, ease: "linear" },
          opacity: { duration: 0.25, ease: "easeOut" },
        }}
      />

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {SPARK_CONFIGS.map(({ delay, x, y }, idx) => (
          <motion.span
            key={`spark-${idx}`}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FFB45E] opacity-70 mix-blend-screen"
            animate={{ x, y, opacity: [0.7, 1, 0.4, 0.7] }}
            transition={{ duration: LOOP_DURATION, repeat: Infinity, ease: "easeInOut", delay }}
          />
        ))}
      </div>

      <span className="relative flex h-16 w-16 items-center justify-center select-none">
        <AnimatePresence mode="wait" initial={false}>
          {isLoading ? (
            <motion.span
              key="loading"
              className="flex h-full w-full items-center justify-center"
              initial={{ opacity: 0.8 }}
              animate={{ opacity: [0.8, 1, 0.8], scale: 0.95 }}
              exit={{ opacity: 0.5, scale: 0.9 }}
              transition={{ duration: LOOP_DURATION, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image src="/assets/logos/logo_orange.svg" alt="" role="presentation" width={64} height={64} priority={false} />
            </motion.span>
          ) : (
            <motion.span
              key="logo"
              className="flex h-full w-full items-center justify-center"
              initial={{ opacity: 0.6, scale: 0.9 }}
              animate={{
                opacity: [0.6, 1, 0.7, 1],
                scale: [0.9, 1.05, 0.92, 0.98],
                filter: ["brightness(1)", "brightness(1.25)", "brightness(0.95)", "brightness(1)"]
              }}
              exit={{ opacity: 0.4, scale: 0.85 }}
              transition={{ duration: LOOP_DURATION, repeat: Infinity, ease: "easeInOut", times: [0, 0.25, 0.6, 1] }}
            >
              <Image src="/assets/logos/logo_orange.svg" alt="" role="presentation" width={64} height={64} priority={false} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="sr-only">Start conversation</span>
    </motion.button>
  );
}

export default StartConversationButton;
