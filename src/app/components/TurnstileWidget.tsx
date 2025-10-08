"use client";

import { useEffect } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

interface TurnstileWidgetProps {
  siteKey?: string | null;
  onToken: (token: string | null) => void;
  action?: string;
  cData?: string;
  className?: string;
  refreshKey?: number;
  theme?: "light" | "dark";
  onLoad?: () => void;
}

export function TurnstileWidget({
  siteKey,
  onToken,
  action,
  cData,
  className,
  refreshKey = 0,
  theme = "dark",
  onLoad,
}: TurnstileWidgetProps) {
  useEffect(() => {
    if (!siteKey) {
      onToken(null);
    }
  }, [siteKey, onToken]);

  if (!siteKey) return null;

  return (
    <Turnstile
      key={`${siteKey}:${refreshKey}`}
      siteKey={siteKey}
      options={{ theme, action, cData }}
      onSuccess={(token) => onToken(token)}
      onError={() => onToken(null)}
      onExpire={() => onToken(null)}
      onLoad={onLoad}
      className={className}
    />
  );
}
