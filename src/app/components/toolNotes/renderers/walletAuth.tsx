import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, HashBadge, SECTION_TITLE_CLASS, normalizeOutput, unwrapStructured } from "./helpers";

const walletAuthRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const payload = unwrapStructured(rawOutput);

  const summary = payload && typeof payload === "object" ? payload : {};
  const diagnostics = typeof (summary as any)?.diagnostics === "object" && (summary as any).diagnostics ? (summary as any).diagnostics : null;

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Auth Diagnostics</div>
          <div className="mt-2 text-xs text-neutral-400">{item.timestamp}</div>
        </div>
        <div className="rounded-full border border-neutral-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-neutral-300">
          Source: {(summary as any)?.source || "unknown"}
        </div>
      </div>

      <div className="mt-4 space-y-3 text-xs text-neutral-300">
        {(summary as any)?.wallet_address ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-500 uppercase tracking-[0.24em]">Active wallet</span>
            <HashBadge value={(summary as any).wallet_address} href={`https://solscan.io/account/${(summary as any).wallet_address}`} ariaLabel="Active wallet" />
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-800/50 bg-surface-glass/40 px-3 py-2 text-neutral-400">
            No wallet bound to this session.
          </div>
        )}

        {(summary as any)?.user_id && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-neutral-500 uppercase tracking-[0.24em]">Supabase user</span>
            <HashBadge value={(summary as any).user_id} />
          </div>
        )}

        {diagnostics && (
          <div className="rounded-xl border border-neutral-800/50 bg-surface-glass/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">Diagnostics</div>
            <div className="mt-2 grid gap-2 text-xs text-neutral-300">
              <DiagnosticRow label="Bearer source" value={diagnostics.bearer_source} />
              <DiagnosticRow label="Has token" value={diagnostics.has_token ? "yes" : "no"} />
              <DiagnosticRow label="Session override" value={diagnostics.override_session || "none"} />
              <DiagnosticRow label="Resolver detail" value={diagnostics.detail || ""} />
              <DiagnosticRow label="Wallets cached" value={diagnostics.wallets_cached?.toString()} />
            </div>
          </div>
        )}
      </div>

      {debug && (
        <div className="mt-4 border-t border-neutral-800/50 pt-3">
          <button
            type="button"
            onClick={onToggle}
            className="text-xs uppercase tracking-[0.24em] text-neutral-400 transition hover:text-neutral-200"
          >
            {isExpanded ? "Hide raw payload" : "Show raw payload"}
          </button>
          {isExpanded && (
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-neutral-800/60 bg-surface-base/80 p-3 text-[11px] text-neutral-200">
              {JSON.stringify(rawOutput, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

function DiagnosticRow({ label, value }: { label: string; value?: string | null }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-neutral-500 uppercase tracking-[0.24em]">{label}</span>
      <span className="text-neutral-100">{value}</span>
    </div>
  );
}

export default walletAuthRenderer;
