"use client";

import React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

type StartConversationButtonProps = {
  onClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
};

const BREATH_DURATION = 5.2;

export function StartConversationButton({ onClick, isLoading = false, disabled }: StartConversationButtonProps) {
  const isDisabled = disabled ?? isLoading;
  const [isInteracting, setIsInteracting] = React.useState(false);
  const isHovering = isInteracting && !isLoading;
  const isExcited = isHovering || isLoading;

  const glowAnimation = isExcited
    ? { opacity: [0.55, 0.15, 0.45], scale: [0.92, 1.5, 1.82], duration: 1.35 }
    : { opacity: [0.42, 0.12, 0.32], scale: [0.9, 1.35, 1.65], duration: 2.4 };

  const borderOpacity = isExcited ? [0.55, 0.9, 0.6] : [0.4, 0.6, 0.45];
  const rotationSpeed = isExcited ? 2.5 : 4;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className="group relative mx-auto flex h-28 w-28 items-center justify-center rounded-full text-white focus:outline-none focus:ring-2 focus:ring-[#FEFBF4]/65 focus:ring-offset-2 focus:ring-offset-[#2b1204] disabled:cursor-not-allowed disabled:opacity-75"
      style={{
        background: "radial-gradient(circle at 32% 28%, #FEFBF4 0%, #F26B1A 42%, #F23E01 100%)",
      }}
      initial={{ scale: 0.98 }}
      animate={{ scale: [0.99, 1.04, 0.99] }}
      transition={{ duration: BREATH_DURATION * 0.8, repeat: Infinity, ease: [0.6, 0, 0.4, 1] }}
      whileHover={{ scale: 1.12, rotate: 0.4 }}
      whileFocus={{ scale: 1.12, rotate: 0.4 }}
      whileTap={{ scale: 0.95 }}
      onHoverStart={() => setIsInteracting(true)}
      onHoverEnd={() => setIsInteracting(false)}
      onFocus={() => setIsInteracting(true)}
      onBlur={() => setIsInteracting(false)}
    >
      <motion.span
        className="pointer-events-none absolute inset-[-14px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(254,251,244,0.32) 0%, rgba(242,62,1,0) 72%)",
        }}
        animate={{ opacity: glowAnimation.opacity, scale: glowAnimation.scale }}
        transition={{ duration: glowAnimation.duration, repeat: Infinity, ease: "easeOut" }}
      />

      <AnimatePresence>
        {isHovering && (
          <motion.span
            key="hover-crest"
            className="pointer-events-none absolute inset-[-20px] rounded-full border border-[#FEFBF4]/30"
            initial={{ scale: 0.85, opacity: 0.35 }}
            animate={{ scale: 1.85, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          />
        )}
      </AnimatePresence>

      <motion.span
        className="pointer-events-none absolute inset-0 rounded-full border border-[#FEFBF4]/30"
        animate={{ opacity: borderOpacity }}
        transition={{ duration: BREATH_DURATION, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.span
        className="pointer-events-none absolute inset-2 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(254,251,244,0.0) 0deg, rgba(254,251,244,0.35) 120deg, rgba(254,251,244,0.0) 240deg)",
        }}
        animate={{ rotate: 360, opacity: isExcited ? 0.55 : 0.3 }}
        transition={{ rotate: { duration: rotationSpeed, repeat: Infinity, ease: "linear" }, opacity: { duration: 0.35 } }}
      />

      <motion.div
        className="relative flex h-20 w-20 items-center justify-center rounded-full shadow-[inset_0_0_10px_rgba(24,5,0,0.25)]"
        style={{
          background: "radial-gradient(circle at 30% 30%, #FEFBF4 6%, #F26B1A 52%, #F23E01 100%)",
        }}
        animate={{ scale: isLoading ? [0.98, 1.05, 0.99] : [0.995, 1.02, 0.995] }}
        transition={{ duration: isLoading ? 0.85 : BREATH_DURATION * 0.85, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
      >
        <motion.div
          className="flex items-center justify-center"
          animate={{
            filter: isExcited
              ? [
                  "drop-shadow(0 0 0px rgba(254,251,244,0))",
                  "drop-shadow(0 0 18px rgba(254,251,244,0.55))",
                  "drop-shadow(0 0 0px rgba(254,251,244,0))",
                ]
              : [
                  "drop-shadow(0 0 0px rgba(254,251,244,0))",
                  "drop-shadow(0 0 10px rgba(254,251,244,0.3))",
                  "drop-shadow(0 0 0px rgba(254,251,244,0))",
                ],
            scale: isExcited ? [0.99, 1.05, 1.01] : [1, 1.02, 1],
            rotate: isHovering ? [0, -1.5, 1.5, 0] : 0,
          }}
          transition={{ duration: isExcited ? 1.05 : BREATH_DURATION, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
        >
          <Image
            src="/assets/logos/logo_orange_round.svg"
            alt="Dexter"
            role="presentation"
            width={72}
            height={72}
            priority={false}
          />
        </motion.div>
      </motion.div>

      <span className="sr-only">Start conversation</span>
    </motion.button>
  );
}

export default StartConversationButton;
