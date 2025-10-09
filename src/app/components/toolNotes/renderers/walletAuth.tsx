import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, HashBadge } from "./helpers";
import { MetricPill } from "./solanaVisuals";

type Diagnostics = {
  bearer_source?: string;
  has_token?: boolean;
  override_session?: string;
  detail?: string;
  wallets_cached?: number;
};

type AuthSummary = {
  wallet_address?: string;
  user_id?: string;
  source?: string;
  diagnostics?: Diagnostics;
};

const walletAuthRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(normalized) as AuthSummary;

  const diagnostics = payload.diagnostics ?? {};

  const diagnosticChips: { label: string; value: string; tone?: "neutral" | "positive" | "negative" | "notice" }[] = [];
  if (payload.source) diagnosticChips.push({ label: "Source", value: payload.source });
  if (diagnostics.bearer_source) diagnosticChips.push({ label: "Bearer", value: diagnostics.bearer_source });
  if (diagnostics.override_session) diagnosticChips.push({ label: "Override", value: diagnostics.override_session, tone: "notice" });
  if (diagnostics.wallets_cached !== undefined) diagnosticChips.push({ label: "Cached", value: String(diagnostics.wallets_cached) });
  if (diagnostics.has_token !== undefined) diagnosticChips.push({ label: "Token", value: diagnostics.has_token ? "Present" : "Missing", tone: diagnostics.has_token ? "positive" : "negative" });

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-7">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">Auth Diagnostics</span>
            <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
          </div>
        </header>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Active wallet</span>
            {payload.wallet_address ? (
              <HashBadge value={payload.wallet_address} href={`https://solscan.io/account/${payload.wallet_address}`} ariaLabel="Active wallet" />
            ) : (
              <span className="text-slate-500">No wallet bound to this session.</span>
            )}
          </div>

          {payload.user_id && (
            <div className="flex flex-col gap-2 text-sm text-slate-600">
              <span className="text-[11px] uppercase tracking-[0.24em] text-slate-300">Supabase user</span>
              <HashBadge value={payload.user_id} ariaLabel="Supabase user id" />
            </div>
          )}

          {diagnosticChips.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {diagnosticChips.map((chip, idx) => (
                <MetricPill key={`${chip.label}-${idx}`} label={chip.label} value={chip.value} tone={chip.tone ?? "neutral"} />
              ))}
            </div>
          )}

          {diagnostics.detail && (
            <p className="text-sm text-slate-600">{diagnostics.detail}</p>
          )}
        </div>
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Raw auth payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-xs">
            {JSON.stringify(normalized, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default walletAuthRenderer;
