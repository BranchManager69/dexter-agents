import React from "react";

interface DexterShellProps {
  topBar: React.ReactNode;
  hero: React.ReactNode;
  heroControls?: React.ReactNode;
  heroWrapperClassName?: string;
  heroCollapsed?: boolean;
  messages: React.ReactNode;
  inputBar: React.ReactNode;
  signals?: React.ReactNode | null;
  statusBar: React.ReactNode;
  voiceDock?: React.ReactNode;
  mobileOverlay?: React.ReactNode;
}

export function DexterShell({
  topBar,
  hero,
  heroControls,
  heroWrapperClassName,
  heroCollapsed = false,
  messages,
  inputBar,
  signals,
  statusBar,
  voiceDock,
  mobileOverlay,
}: DexterShellProps) {
  const heroSectionClasses = [
    heroWrapperClassName,
    "flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between",
    heroCollapsed ? "gap-4" : null,
  ]
    .filter(Boolean)
    .join(" ");

  const heroContentClasses = [
    "flex-1 overflow-hidden transition-all duration-500 ease-out",
    heroCollapsed ? "pointer-events-none max-h-0 opacity-0 -translate-y-2" : "max-h-[360px] opacity-100 translate-y-0",
  ]
    .filter(Boolean)
    .join(" ");

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
            <div className={heroSectionClasses}>
              {hero ? (
                <div className={heroContentClasses} aria-hidden={heroCollapsed}>
                  <div className="pr-0 lg:pr-6">
                    {hero}
                  </div>
                </div>
              ) : null}
              {heroControls ? (
                <div className="max-w-full lg:w-80 lg:flex-shrink-0">
                  {heroControls}
                </div>
              ) : null}
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {messages}
            </div>
            {inputBar}
          </div>
          {signals ? (
            <aside className="hidden w-full max-w-sm flex-col lg:flex">
              {signals}
            </aside>
          ) : null}
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
