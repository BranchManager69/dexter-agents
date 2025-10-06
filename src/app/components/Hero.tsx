"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface HeroProps {
  className?: string;
  title: string;
  subtitle: string;
  loading?: boolean;
}

export function Hero({ className, title, subtitle, loading = false }: HeroProps) {
  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="hero-skeleton"
            className="space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="h-6 w-60 rounded-full bg-[#FFE6CC]/60" />
            <div className="h-4 w-72 rounded-full bg-[#FFE6CC]/40" />
          </motion.div>
        ) : (
          <motion.div
            key={title + subtitle}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            data-hero-anchor
          >
            <div data-hero-heading className="font-display text-3xl tracking-tight text-[#6B320F]">
              {title}
            </div>
            <p className="mt-2 max-w-2xl text-sm text-[#A75A26]">
              {subtitle}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Hero;
