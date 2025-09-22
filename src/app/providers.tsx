"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./auth-context";
import { TranscriptProvider } from "./contexts/TranscriptContext";
import { EventProvider } from "./contexts/EventContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <TranscriptProvider>
        <EventProvider>{children}</EventProvider>
      </TranscriptProvider>
    </AuthProvider>
  );
}
