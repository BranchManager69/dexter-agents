"use client";

import React from "react";

interface HeroProps {
  className?: string;
}

export function Hero({ className }: HeroProps) {
  return (
    <div className={className}>
      <div className="font-display text-3xl tracking-tight text-[#6B320F]">
        You say, I do.
      </div>
      <p className="mt-2 max-w-2xl text-sm text-[#A75A26]/82">
        Dexter synchronises research, trade execution, wallet management, and Solana-specific feeds through a single multimodal agent. Speak or type—every insight rolls in with receipts.
      </p>
    </div>
  );
}

export default Hero;
