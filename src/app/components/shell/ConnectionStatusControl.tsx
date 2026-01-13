import React from "react";
import { SessionStatus } from "@/app/types";

interface ConnectionStatusControlProps {
  sessionStatus: SessionStatus;
  onToggleConnection?: () => void;
  className?: string;
  allowReconnect?: boolean;
}

function getStatusVisual(sessionStatus: SessionStatus) {
  switch (sessionStatus) {
    case "CONNECTED":
      return { label: "Live", dotClass: "bg-[#16C98C]", textClass: "text-[#F87171]" };
    case "CONNECTING":
      return { label: "Linking", dotClass: "bg-[#26B5FF]", textClass: "text-[#7FD0FF]" };
    case "ERROR":
      return { label: "Fault", dotClass: "bg-[#FF4D69]", textClass: "text-[#FF96AD]" };
    default:
      return { label: "Offline", dotClass: "bg-[#FF3B30]", textClass: "text-[#FF8A7F]" };
  }
}

function getConnectionLabel(sessionStatus: SessionStatus, allowReconnect: boolean) {
  if (sessionStatus === "CONNECTED") return "Disconnect";
  if (sessionStatus === "CONNECTING") return "Connecting…";
  if (sessionStatus === "ERROR") return "Retry";
  if (sessionStatus === "DISCONNECTED" && allowReconnect) return "Connect";
  return "";
}

export function ConnectionStatusControl({
  sessionStatus,
  onToggleConnection,
  className,
  allowReconnect = false,
}: ConnectionStatusControlProps) {
  const { label, dotClass, textClass } = getStatusVisual(sessionStatus);
  const buttonLabel = getConnectionLabel(sessionStatus, allowReconnect);
  const showLabel = buttonLabel.trim().length > 0;
  const buttonAriaLabel = showLabel
    ? buttonLabel
    : sessionStatus === "DISCONNECTED" && allowReconnect
      ? "Connect"
      : "Connection control";

  const containerClassName = [
    "flex flex-shrink-0 items-center gap-2 rounded-sm border border-white/10 bg-black/60 backdrop-blur-sm px-3 py-1.5 font-display text-[10px] font-semibold tracking-[0.08em] shadow-lg",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClassName}>
      <span className="flex flex-shrink-0 items-center gap-2" title={`Connection status: ${label}`}>
        <span className={`h-2 w-2 rounded-full ${dotClass} ${sessionStatus === "CONNECTING" ? "animate-pulse" : ""}`} aria-hidden="true" />
        <span className="text-[#FFF3E3]/80">{label}</span>
      </span>

      {onToggleConnection && showLabel ? (
        <button
          type="button"
          onClick={onToggleConnection}
          className={`flex flex-shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 transition ${
            sessionStatus === "CONNECTED" 
              ? "bg-red-500/20 text-red-300 hover:bg-red-500/30" 
              : sessionStatus === "CONNECTING"
                ? "bg-blue-500/20 text-blue-300"
                : "bg-white/10 text-[#FFF3E3]/80 hover:bg-white/20"
          }`}
          aria-label={buttonAriaLabel}
        >
          {buttonLabel}
        </button>
      ) : null}
    </div>
  );
}

export default ConnectionStatusControl;
