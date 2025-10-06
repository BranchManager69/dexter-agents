import React from "react";
import { motion } from "framer-motion";

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
  const heroPadding = heroCollapsed ? "pt-1" : "pt-4";

  const heroSectionClasses = [
    heroWrapperClassName,
    "flex flex-col lg:flex-row lg:items-start lg:justify-between",
    heroCollapsed ? "gap-1 lg:gap-4" : "gap-6",
    heroPadding,
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
    <div className="relative flex h-[100dvh] flex-col overflow-hidden text-foreground">

      <header className="dexter-header relative z-30 flex-shrink-0 backdrop-blur-xl">
        {topBar}
      </header>

      <main className="z-10 flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="flex w-full flex-1 flex-col overflow-hidden">
            <div className="relative">
              <motion.div
                className="pointer-events-none absolute -inset-16 sm:-inset-20 lg:-inset-24"
                initial={{ opacity: 0, scale: 0.9, x: '-18%', y: '-20%' }}
                animate={{
                  opacity: heroCollapsed ? 0 : 0.72,
                  scale: heroCollapsed ? 0.9 : [0.96, 1.14, 0.96],
                  x: heroCollapsed ? '-18%' : ['-12%', '-22%', '-12%'],
                  y: heroCollapsed ? '-20%' : ['-16%', '-24%', '-16%'],
                }}
                transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  background:
                    'radial-gradient(circle at center, rgba(242, 124, 61, 0.78), transparent 74%)',
                  filter: 'blur(34px)',
                  mixBlendMode: 'screen',
                }}
              />
              <motion.div
                className="pointer-events-none absolute -inset-8 sm:-inset-10 lg:-inset-12"
                initial={{ opacity: 0, scale: 0.95, x: '14%', y: '18%' }}
                animate={{
                  opacity: heroCollapsed ? 0 : 0.58,
                  scale: heroCollapsed ? 0.95 : [1.02, 1.12, 1.02],
                  x: heroCollapsed ? '14%' : ['8%', '20%', '8%'],
                  y: heroCollapsed ? '18%' : ['14%', '26%', '14%'],
                }}
                transition={{ duration: 16, delay: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  background:
                    'radial-gradient(circle at center, rgba(255, 235, 204, 0.6), transparent 70%)',
                  filter: 'blur(44px)',
                  mixBlendMode: 'screen',
                }}
              />
              <div className={heroSectionClasses}>
                {hero ? (
                  <div className={heroContentClasses} aria-hidden={heroCollapsed}>
                    <div className="relative pr-0 lg:pr-6">
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
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {messages}
              {voiceDock ? (
                <div className="flex-shrink-0 border-t border-neutral-800/60 bg-surface-base/70 px-2 py-1">
                  {voiceDock}
                </div>
              ) : null}
              {inputBar}
            </div>
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
      {mobileOverlay}
    </div>
  );
}

export default DexterShell;
