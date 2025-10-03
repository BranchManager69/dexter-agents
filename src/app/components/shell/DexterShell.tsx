import React from "react";

interface DexterShellProps {
  topBar: React.ReactNode;
  hero: React.ReactNode;
  messages: React.ReactNode;
  inputBar: React.ReactNode;
  signals: React.ReactNode;
  statusBar: React.ReactNode;
  voiceDock?: React.ReactNode;
  mobileOverlay?: React.ReactNode;
}

export function DexterShell({
  topBar,
  hero,
  messages,
  inputBar,
  signals,
  statusBar,
  voiceDock,
  mobileOverlay,
}: DexterShellProps) {
  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle at 14% 18%, rgb(var(--color-primary-bright) / 0.32), transparent 55%), radial-gradient(circle at 82% 14%, rgb(var(--color-accent-info) / 0.22), transparent 52%), radial-gradient(circle at 65% 78%, rgb(var(--color-flux) / 0.18), transparent 60%)",
          }}
        />
      </div>

      <header className="relative z-30 flex-shrink-0 border-b border-header-border/50 bg-header/90 backdrop-blur-xl">
        {topBar}
      </header>

      <main className="z-10 flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="flex w-full flex-1 flex-col overflow-hidden">
            {hero}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {messages}
            </div>
            {inputBar}
          </div>

          <aside className="hidden w-full max-w-sm flex-col lg:flex">
            {signals}
          </aside>
        </div>
      </main>

      <footer className="relative z-10 flex-shrink-0 border-t border-footer-border/50 bg-footer/90 backdrop-blur-xl">
        {statusBar}
      </footer>

      {/* Floating Voice Dock - with scale animation */}
      <div className="pointer-events-none fixed bottom-10 left-9 right-auto z-20 max-w-xs">
        <div
          className={`pointer-events-auto transition-all duration-300 ease-out ${
            voiceDock
              ? "scale-100 opacity-100"
              : "scale-75 opacity-0"
          }`}
        >
          {voiceDock}
        </div>
      </div>

      {mobileOverlay}
    </div>
  );
}

export default DexterShell;
