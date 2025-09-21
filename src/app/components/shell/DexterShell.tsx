import React from "react";

interface DexterShellProps {
  topBar: React.ReactNode;
  conversation: React.ReactNode;
  signals: React.ReactNode;
  statusBar: React.ReactNode;
  voiceDock: React.ReactNode;
  mobileOverlay?: React.ReactNode;
}

export function DexterShell({
  topBar,
  conversation,
  signals,
  statusBar,
  voiceDock,
  mobileOverlay,
}: DexterShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-70 bg-gradient-to-br from-[#0C1220] via-transparent to-[#04060A]" />
      </div>

      <header className="relative z-10 border-b border-neutral-800/60 bg-background/70 backdrop-blur-xl">
        {topBar}
      </header>

      <main className="relative z-10 flex flex-1 flex-col gap-7.5 px-9 py-8">
        <div className="flex flex-1 flex-col gap-7.5 lg:flex-row">
          <section className="flex w-full flex-1 flex-col rounded-lg border border-neutral-800/60 bg-surface-base/80 shadow-elevated backdrop-blur-xl">
            {conversation}
          </section>

          <aside className="hidden w-full max-w-sm flex-col gap-4 rounded-lg border border-neutral-800/60 bg-surface-raised/80 shadow-elevated backdrop-blur-xl lg:flex">
            {signals}
          </aside>
        </div>
      </main>

      <footer className="relative z-10 border-t border-neutral-800/60 bg-background/70 backdrop-blur-xl">
        {statusBar}
      </footer>

      <div className="pointer-events-none fixed bottom-10 left-9 right-auto z-20 max-w-xs">
        <div className="pointer-events-auto">{voiceDock}</div>
      </div>

      {mobileOverlay}
    </div>
  );
}

export default DexterShell;
