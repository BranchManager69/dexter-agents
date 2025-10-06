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
          <div className="mt-2 text-xs text-[#F9D9C3]">{item.timestamp}</div>
        </div>
        <div className="rounded-full border border-[#F7BE8A]/30 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#FFE4CF]">
          Source: {(summary as any)?.source || "unknown"}
        </div>
      </div>

      <div className="mt-4 space-y-3 text-xs text-[#FFE4CF]">
        {(summary as any)?.wallet_address ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#F0BFA1] uppercase tracking-[0.24em]">Active wallet</span>
            <HashBadge value={(summary as any).wallet_address} href={`https://solscan.io/account/${(summary as any).wallet_address}`} ariaLabel="Active wallet" />
          </div>
        ) : (
          <div className="rounded-lg border border-[#F7BE8A]/22 bg-[#1A090D]/70 px-3 py-2 text-[#F9D9C3]">
            No wallet bound to this session.
          </div>
        )}

        {(summary as any)?.user_id && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[#F0BFA1] uppercase tracking-[0.24em]">Supabase user</span>
            <HashBadge value={(summary as any).user_id} />
          </div>
        )}

        {diagnostics && (
          <div className="rounded-xl border border-[#F7BE8A]/22 bg-[#1A090D]/70 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#F0BFA1]">Diagnostics</div>
            <div className="mt-2 grid gap-2 text-xs text-[#FFE4CF]">
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
        <div className="mt-4 border-t border-[#F7BE8A]/22 pt-3">
          <button
            type="button"
            onClick={onToggle}
            className="text-xs uppercase tracking-[0.24em] text-[#F9D9C3] transition hover:text-[#FFF2E2]"
          >
            {isExpanded ? "Hide raw payload" : "Show raw payload"}
          </button>
          {isExpanded && (
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-[#F7BE8A]/24 bg-[#16070C]/85 p-3 text-[11px] text-[#FFF2E2]">
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
      <span className="text-[#F0BFA1] uppercase tracking-[0.24em]">{label}</span>
      <span className="text-[#FFF6EC]">{value}</span>
    </div>
  );
}

export default walletAuthRenderer;
