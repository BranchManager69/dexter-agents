import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, HashBadge } from "./helpers";
import { LinkPill, MetricPill } from "./solanaVisuals";

type OverridePayload = {
  ok?: boolean;
  cleared?: boolean;
  wallet_address?: string;
};

type OverrideArgs = {
  wallet_address?: string;
};

const walletOverrideRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(normalized) as OverridePayload;
  const args = ((item.data as any)?.arguments ?? {}) as OverrideArgs;

  const cleared = Boolean(payload.cleared);
  const ok = Boolean(payload.ok);
  const walletAddress = payload.wallet_address ?? args.wallet_address ?? undefined;

  const statusLabel = cleared ? "Override cleared" : ok ? "Override active" : "Override failed";
  const statusTone: "neutral" | "positive" | "negative" | "notice" = cleared ? "notice" : ok ? "positive" : "negative";

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-7">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">Wallet Override</span>
            <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
          </div>
          <MetricPill label="Status" value={statusLabel} tone={statusTone} />
        </header>

        <div className="flex flex-col gap-3 text-sm text-slate-600">
          {walletAddress ? (
            <>
              <span className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Override wallet</span>
              <HashBadge value={walletAddress} href={`https://solscan.io/account/${walletAddress}`} ariaLabel="Override wallet address" />
              <div className="flex flex-wrap gap-2">
                <LinkPill value="View on Solscan" href={`https://solscan.io/account/${walletAddress}`} />
              </div>
            </>
          ) : (
            <span className="text-slate-500">No wallet provided for this override.</span>
          )}

          {cleared && <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Session reverted to resolver defaults.</span>}
        </div>
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Raw override payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-xs">
            {JSON.stringify(normalized, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default walletOverrideRenderer;
