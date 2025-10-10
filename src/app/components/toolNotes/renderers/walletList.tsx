import React from "react";

import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, normalizeOutput, unwrapStructured, HashBadge } from "./helpers";
import { MetricPill, LinkPill } from "./solanaVisuals";

type WalletRecord = {
  address?: string;
  public_key?: string;
  label?: string;
  status?: string;
  is_default?: boolean;
};

type WalletListPayload = {
  user?: { id?: string };
  wallets?: WalletRecord[];
};

function pickAddress(wallet: WalletRecord): string | null {
  if (wallet.address && wallet.address.trim().length > 0) return wallet.address.trim();
  if (wallet.public_key && wallet.public_key.trim().length > 0) return wallet.public_key.trim();
  return null;
}

const walletListRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(normalized) as WalletListPayload | WalletRecord[];

  const wallets: WalletRecord[] = Array.isArray((payload as WalletListPayload)?.wallets)
    ? ((payload as WalletListPayload).wallets as WalletRecord[])
    : Array.isArray(payload)
      ? (payload as WalletRecord[])
      : [];

  const visibleWallets = wallets.slice(0, 6);
  const hasMore = wallets.length > visibleWallets.length;

  return (
    <div className={BASE_CARD_CLASS}>
      <section className="flex flex-col gap-7">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.26em] text-indigo-500">Linked Wallets</span>
            <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
          </div>
          <MetricPill label="Total" value={`${wallets.length}`} tone={wallets.length ? "neutral" : "notice"} />
        </header>

        <div className="flex flex-col gap-4">
          {visibleWallets.map((wallet, index) => {
            const address = pickAddress(wallet);
            const label = typeof wallet.label === "string" && wallet.label.trim().length > 0 ? wallet.label.trim() : null;
            const status = typeof wallet.status === "string" ? wallet.status : null;
            const isDefault = Boolean(wallet.is_default);

            return (
              <article key={address ?? `wallet-${index}`} className="flex flex-col gap-3 border-b border-slate-200/60 pb-4 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-semibold text-slate-900">{label ?? (address ? `${address.slice(0, 4)}…${address.slice(-4)}` : `Wallet ${index + 1}`)}</span>
                    {address && <HashBadge value={address} href={`https://solscan.io/account/${address}`} ariaLabel="Wallet address" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isDefault && <MetricPill label="Role" value="Default" tone="positive" />}
                    {status && <MetricPill label="Status" value={status} />}
                  </div>
                </div>
                {address && (
                  <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                    <LinkPill value="Open in Solscan" href={`https://solscan.io/account/${address}`} />
                  </div>
                )}
              </article>
            );
          })}

          {visibleWallets.length === 0 && (
            <p className="text-sm text-slate-500">No wallets linked to this account.</p>
          )}
        </div>

        {hasMore && (
          <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Showing first {visibleWallets.length} of {wallets.length}</span>
        )}
      </section>

      {debug && (
        <details className="mt-4 max-w-2xl text-sm text-slate-700" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
            Raw wallet payload
          </summary>
          <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200/70 bg-white/80 p-3 text-xs">
            {JSON.stringify(normalized, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default walletListRenderer;
