import React from "react";
import { SessionStatus } from "@/app/types";

interface BottomStatusRailProps {
  sessionStatus: SessionStatus;
  onToggleConnection: () => void;
  isAudioPlaybackEnabled: boolean;
  setIsAudioPlaybackEnabled: (value: boolean) => void;
  isEventsPaneExpanded: boolean;
  setIsEventsPaneExpanded: (value: boolean) => void;
  codec: string;
  onCodecChange: (codec: string) => void;
}

function getConnectLabel(sessionStatus: SessionStatus) {
  switch (sessionStatus) {
    case "CONNECTED":
      return "Disconnect";
    case "CONNECTING":
      return "Connecting";
    default:
      return "Connect";
  }
}

export function BottomStatusRail({
  sessionStatus,
  onToggleConnection,
  isAudioPlaybackEnabled,
  setIsAudioPlaybackEnabled,
  isEventsPaneExpanded,
  setIsEventsPaneExpanded,
  codec,
  onCodecChange,
}: BottomStatusRailProps) {
  const isConnecting = sessionStatus === "CONNECTING";
  const isConnected = sessionStatus === "CONNECTED";

  return (
    <div className="flex flex-col gap-3 px-9 py-4 text-sm text-neutral-200 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onToggleConnection}
          disabled={isConnecting}
          className={`rounded-pill px-5 py-2 text-sm font-medium transition ${
            isConnected
              ? "bg-iris/20 text-iris hover:bg-iris/30"
              : "bg-flux/20 text-flux hover:bg-flux/30"
          } ${isConnecting ? "opacity-70" : ""}`}
        >
          {getConnectLabel(sessionStatus)}
        </button>

        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neutral-500">
          <span>Audio</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-flux"
            checked={isAudioPlaybackEnabled}
            onChange={(event) => setIsAudioPlaybackEnabled(event.target.checked)}
            disabled={!isConnected}
          />
        </label>

        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-neutral-500">
          <span>Logs</span>
          <input
            type="checkbox"
            className="h-4 w-4 accent-iris"
            checked={isEventsPaneExpanded}
            onChange={(event) => setIsEventsPaneExpanded(event.target.checked)}
          />
        </label>
      </div>

      <div className="flex items-center gap-4 text-xs uppercase tracking-[0.25em] text-neutral-500">
        <span>Codec</span>
        <select
          value={codec}
          onChange={(event) => onCodecChange(event.target.value)}
          className="rounded-md border border-neutral-800/80 bg-surface-glass/60 px-4 py-2 text-sm normal-case text-neutral-200 outline-none transition focus:border-flux/60 focus:ring-2 focus:ring-flux/30"
        >
          <option value="opus">Opus (48k)</option>
          <option value="pcmu">PCMU (8k)</option>
          <option value="pcma">PCMA (8k)</option>
        </select>
      </div>
    </div>
  );
}

export default BottomStatusRail;
