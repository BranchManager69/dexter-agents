"use client";

import { type HedgefundWalletSummary } from "@/app/lib/hedgefund";

interface HedgefundWalletsCardProps {
  wallets: HedgefundWalletSummary[];
  loading: boolean;
}

function shorten(pubkey: string): string {
  return pubkey.length <= 12 ? pubkey : `${pubkey.slice(0, 4)}…${pubkey.slice(-4)}`;
}

export function HedgefundWalletsCard({ wallets, loading }: HedgefundWalletsCardProps) {
  return (
    <section className="rounded-xl border border-border-subtle/70 bg-surface-base/80 p-6 shadow-inner">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Wallets</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Execution Pool</h2>
      </header>

      <div className="overflow-hidden rounded-lg border border-border-subtle/60">
        <table className="min-w-full divide-y divide-border-subtle/40 text-sm">
          <thead className="bg-surface-raised/70 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">Alias</th>
              <th scope="col" className="px-4 py-3 text-left">Public Key</th>
              <th scope="col" className="px-4 py-3 text-right">Weight</th>
              <th scope="col" className="px-4 py-3 text-left">Tags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40 bg-surface-base/60 text-neutral-200">
            {wallets.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  {loading ? "Loading wallets…" : "No hedgefund wallets configured."}
                </td>
              </tr>
            ) : (
              wallets.map((wallet) => (
                <tr key={wallet.alias}>
                  <td className="px-4 py-3 font-medium text-foreground">{wallet.alias}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-300">{shorten(wallet.publicKey)}</td>
                  <td className="px-4 py-3 text-right text-neutral-200">{wallet.weight.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {wallet.tags?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {wallet.tags.map((tag) => (
                          <span key={tag} className="rounded-full border border-border-subtle/50 px-2 py-0.5 text-xs text-neutral-300">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-neutral-500">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
