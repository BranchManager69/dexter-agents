"use client";

import React from "react";

interface HeroProps {
  className?: string;
  title: string;
  subtitle: string;
}

export function Hero({ className, title, subtitle }: HeroProps) {
  return (
    <div className={className}>
      <div className="font-display text-3xl tracking-tight text-[#6B320F]">
        {title}
      </div>
      <p className="mt-2 max-w-2xl text-sm text-[#A75A26] opacity-95">
        {subtitle}
      </p>
    </div>
  );
}

export default Hero;
