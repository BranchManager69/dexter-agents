import type { ToolNoteRenderer } from "./types";
import { BASE_CARD_CLASS, SECTION_TITLE_CLASS, normalizeOutput, unwrapStructured } from "./helpers";

const streamGetSceneRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const payload = unwrapStructured(rawOutput);

  const activeScene = typeof (payload as any)?.scene === "string" ? (payload as any).scene : null;
  const updatedAt = typeof (payload as any)?.updatedAt === "string" ? (payload as any).updatedAt : null;
  const scenes = Array.isArray((payload as any)?.scenes)
    ? (payload as any).scenes
    : [];

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Current Stream Scene</div>
          <div className="mt-2 text-xs text-neutral-400">{item.timestamp}</div>
        </div>
        {updatedAt && (
          <div className="rounded-full border border-neutral-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-neutral-300">
            Updated {new Date(updatedAt).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3 text-sm text-neutral-200">
        <div className="font-semibold">Active scene</div>
        {activeScene ? (
          <div className="rounded-lg border border-neutral-800/40 bg-surface-glass/40 px-3 py-2 text-sm text-neutral-100">
            {activeScene}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-800/60 px-3 py-2 text-sm text-neutral-400">
            No active scene reported.
          </div>
        )}

        <div>
          <div className="text-xs uppercase tracking-[0.24em] text-neutral-500">Available scenes</div>
          {scenes.length > 0 ? (
            <ul className="mt-2 grid gap-2 text-sm text-neutral-200">
              {scenes.map((scene: any) => (
                <li
                  key={typeof scene === "string" ? scene : JSON.stringify(scene)}
                  className="rounded-lg border border-neutral-800/40 bg-surface-glass/30 px-3 py-2"
                >
                  {typeof scene === "string" ? scene : JSON.stringify(scene)}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 rounded-lg border border-neutral-800/40 bg-surface-glass/30 px-3 py-2 text-xs text-neutral-400">
              Scene list unavailable.
            </div>
          )}
        </div>
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

const streamSetSceneRenderer: ToolNoteRenderer = ({ item, isExpanded, onToggle, debug }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, any> | undefined) || {};
  const result = unwrapStructured(rawOutput);
  const args = (item.data as any)?.arguments ?? {};

  const requestedScene = typeof args?.scene === "string" ? args.scene : null;
  const updatedScene = typeof (result as any)?.scene === "string" ? (result as any).scene : null;
  const updatedAt = typeof (result as any)?.updatedAt === "string" ? (result as any).updatedAt : null;

  const statusLabel = updatedScene ? `Switched to ${updatedScene}` : "Scene update acknowledged";

  return (
    <div className={BASE_CARD_CLASS}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className={SECTION_TITLE_CLASS}>Set Stream Scene</div>
          <div className="mt-2 text-xs text-neutral-400">{item.timestamp}</div>
        </div>
        <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200">
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 space-y-3 text-xs text-neutral-300">
        {requestedScene && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="uppercase tracking-[0.24em] text-neutral-500">Requested</span>
            <span className="text-neutral-100">{requestedScene}</span>
          </div>
        )}
        {updatedScene && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="uppercase tracking-[0.24em] text-neutral-500">Active</span>
            <span className="text-neutral-100">{updatedScene}</span>
          </div>
        )}
        {updatedAt && (
          <div className="text-neutral-400">Updated {new Date(updatedAt).toLocaleTimeString()}</div>
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

export { streamGetSceneRenderer, streamSetSceneRenderer };
