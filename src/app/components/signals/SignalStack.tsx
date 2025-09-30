import React from "react";
import type { MarketPulse, PumpStreams, WalletSignals } from "@/app/hooks/useSignalData";
import type { ToolCatalogEntry } from "@/app/hooks/useToolCatalog";

interface ToolCatalogSnapshot {
  tools: ToolCatalogEntry[];
  loading: boolean;
  error: string | null;
  source: 'live' | 'cache' | 'none';
  lastUpdated: Date | null;
  refresh: () => void;
}

interface SignalStackProps {
  showLogs: boolean;
  logs: React.ReactNode;
  marketPulse: MarketPulse;
  pumpStreams: PumpStreams;
  wallet: WalletSignals;
  toolCatalog: ToolCatalogSnapshot;
}

const STORAGE_KEY_TOOLS_EXPANDED = 'dexter:toolsExpanded';
const STORAGE_KEY_LOGS_EXPANDED = 'dexter:logsExpanded';

function changeToneClass(tone: "positive" | "negative" | "neutral") {
  if (tone === "positive") return "text-flux";
  if (tone === "negative") return "text-accent-critical";
  return "text-neutral-500";
}

function renderEmptyState(message: string) {
  return (
    <div className="rounded-md border border-dashed border-neutral-800/60 bg-surface-glass/40 px-4 py-6 text-center text-xs text-neutral-500">
      {message}
    </div>
  );
}

export function SignalStack({
  showLogs,
  logs,
  marketPulse,
  pumpStreams,
  wallet,
  toolCatalog,
}: SignalStackProps) {
  const [isToolsExpanded, setIsToolsExpanded] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem(STORAGE_KEY_TOOLS_EXPANDED);
    return stored ? stored === 'true' : false;
  });

  const [isLogsExpanded, setIsLogsExpanded] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem(STORAGE_KEY_LOGS_EXPANDED);
    return stored ? stored === 'true' : true;
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_TOOLS_EXPANDED, isToolsExpanded.toString());
    }
  }, [isToolsExpanded]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LOGS_EXPANDED, isLogsExpanded.toString());
    }
  }, [isLogsExpanded]);

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <section className="rounded-lg border border-neutral-800/60 bg-surface-base/80 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm uppercase tracking-[0.3em] text-neutral-400">
            Market Pulse
          </h3>
          <span className="text-xs text-neutral-500">
            {marketPulse.lastUpdated ? `Updated ${marketPulse.lastUpdated}` : "Awaiting data"}
          </span>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          {marketPulse.items.length > 0 ? (
            marketPulse.items.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-2 text-neutral-200"
              >
                <div className="font-mono text-xs uppercase tracking-[0.24em] text-neutral-400">
                  {item.label}
                </div>
                <div className="flex items-center gap-3">
                  <span className={changeToneClass(item.changeTone)}>{item.change}</span>
                  {item.volume && <span className="text-neutral-500">{item.volume}</span>}
                </div>
              </div>
            ))
          ) : (
            renderEmptyState(
              marketPulse.status === "idle"
                ? "No market intel yet. Ask Dexter for a pulse check."
                : "No market data extracted from recent tool calls."
            )
          )}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-800/60 bg-surface-base/80 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm uppercase tracking-[0.3em] text-neutral-400">
            Pump Streams
          </h3>
          <span className="text-xs text-neutral-500">
            {pumpStreams.lastUpdated ? `Updated ${pumpStreams.lastUpdated}` : "Monitoring"}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {pumpStreams.items.length > 0 ? (
            pumpStreams.items.map((stream) => (
              <div
                key={stream.title}
                className="flex items-center justify-between rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-3"
              >
                <div>
                  <div className="font-body text-sm text-neutral-100">{stream.title}</div>
                  <div className="text-xs text-neutral-500">
                    {[stream.viewers, stream.tokenSymbol, stream.momentum]
                      .filter(Boolean)
                      .join(" • ")}
                  </div>
                </div>
                {stream.status && (
                  <span className="rounded-pill bg-iris/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-iris">
                    {stream.status}
                  </span>
                )}
              </div>
            ))
          ) : (
            renderEmptyState(
              pumpStreams.status === "idle"
                ? "Waiting for the first pumpstream_live_summary call."
                : "No active streams reported by the MCP tool."
            )
          )}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-800/60 bg-surface-base/80 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm uppercase tracking-[0.3em] text-neutral-400">
            Wallet Radar
          </h3>
          <span className="text-xs text-neutral-500">
            {wallet.lastUpdated ? `Updated ${wallet.lastUpdated}` : "Resolver"}
          </span>
        </div>
        <div className="mt-3 space-y-2 text-sm text-neutral-200">
          {wallet.status === "ready" ? (
            <>
              <div className="flex items-center justify-between">
                <span>Total Value</span>
                <span className="font-display text-lg text-flux">
                  {wallet.summary.totalUsd ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>24H PnL</span>
                <span className={wallet.summary.pnl24h ? changeToneClass(wallet.summary.pnl24h.tone) : "text-neutral-500"}>
                  {wallet.summary.pnl24h?.label ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Active Wallet</span>
                <span className="rounded-pill bg-neutral-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-neutral-300">
                  {wallet.summary.activeWallet ?? "Auto"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total Wallets</span>
                <span className="rounded-pill bg-neutral-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-neutral-300">
                  {wallet.summary.walletCount ?? "—"}
                </span>
              </div>
            </>
          ) : (
            renderEmptyState(
              wallet.status === "idle"
                ? "Call list_my_wallets to populate wallet intel."
                : "Wallet tool responses did not contain structured balances."
            )
          )}
        </div>
      </section>

      <section className="rounded-lg border border-neutral-800/60 bg-surface-base/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-sm uppercase tracking-[0.3em] text-neutral-400">
              Available Tools
            </h3>
            <span className="rounded-pill border border-neutral-800/60 bg-surface-glass/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-neutral-300">
              {toolCatalog.tools.length}
            </span>
            {toolCatalog.source === 'cache' && (
              <span className="rounded-pill border border-accent-warning/40 bg-accent-warning/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-accent-warning">
                Cached
              </span>
            )}
            {toolCatalog.source === 'live' && (
              <span className="rounded-pill border border-flux/40 bg-flux/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-flux">
                Live
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>
              {toolCatalog.loading
                ? 'Refreshing…'
                : toolCatalog.lastUpdated
                ? `Updated ${toolCatalog.lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : `${toolCatalog.tools.length} listed`}
            </span>
            <button
              type="button"
              onClick={toolCatalog.refresh}
              className="rounded-md border border-neutral-800/60 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-neutral-300 transition hover:border-flux/50 hover:text-flux"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className={`relative mt-3 overflow-hidden rounded-lg transition-all duration-300 ${isToolsExpanded ? 'max-h-96' : 'max-h-60'}`}>
          <div className="space-y-2 text-sm text-neutral-200">
          {toolCatalog.error && (
            <div className="rounded-md border border-accent-critical/40 bg-accent-critical/10 px-3 py-2 text-xs text-accent-critical">
              {toolCatalog.error}
            </div>
          )}
          {toolCatalog.tools.length === 0 && !toolCatalog.loading && !toolCatalog.error && (
            renderEmptyState('No tools reported. Try reloading or checking MCP status.')
          )}
          {toolCatalog.tools.length > 0 && (
            <div className="flex flex-col gap-2">
              {toolCatalog.tools.map((tool) => (
                <div
                  key={tool.name}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-neutral-800/60 bg-surface-glass/60 px-3 py-1"
                  title={tool.description}
                >
                  <span className="text-xs uppercase tracking-[0.2em] text-neutral-200">
                    {tool.name}
                  </span>
                  <span className="rounded-pill border border-neutral-700/60 bg-neutral-900/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                    {tool.access}
                  </span>
                  {tool.tags.map((tag) => (
                    <span
                      key={`${tool.name}-${tag}`}
                      className="rounded-pill border border-neutral-700/40 bg-neutral-900/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-neutral-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
          </div>
          {!isToolsExpanded && (
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex h-28 items-end justify-center bg-gradient-fade-dark pb-4">
              <button
                type="button"
                onClick={() => setIsToolsExpanded(true)}
                className="pointer-events-auto rounded-full border-none bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition hover:-translate-y-0.5"
              >
                Show {toolCatalog.tools.length} tool{toolCatalog.tools.length === 1 ? '' : 's'}
              </button>
            </div>
          )}
          {isToolsExpanded && (
            <div className="flex items-end justify-center pb-3 pt-2">
              <button
                type="button"
                onClick={() => setIsToolsExpanded(false)}
                className="rounded-full border-none bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition hover:-translate-y-0.5"
              >
                Hide tools
              </button>
            </div>
          )}
        </div>
      </section>

      {showLogs && (
        <section className="rounded-lg border border-neutral-800/60 bg-surface-base/80 p-4">
          <h3 className="font-display text-sm uppercase tracking-[0.3em] text-neutral-400">
            Event Logs
          </h3>
          <div className={`relative mt-3 overflow-hidden rounded-lg transition-all duration-300 ${isLogsExpanded ? 'max-h-96' : 'max-h-60'}`}>
            {logs}
            {!isLogsExpanded && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex h-28 items-end justify-center bg-gradient-fade-dark pb-4">
                <button
                  type="button"
                  onClick={() => setIsLogsExpanded(true)}
                  className="pointer-events-auto rounded-full border-none bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition hover:-translate-y-0.5"
                >
                  Show event logs
                </button>
              </div>
            )}
            {isLogsExpanded && (
              <div className="flex items-end justify-center pb-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogsExpanded(false)}
                  className="rounded-full border-none bg-transparent px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition hover:-translate-y-0.5"
                >
                  Hide event logs
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default SignalStack;
