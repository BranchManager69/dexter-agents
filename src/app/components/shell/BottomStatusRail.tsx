import React from "react";

interface BottomStatusRailProps {
  onOpenDebugModal: () => void;
}

export function BottomStatusRail({
  onOpenDebugModal,
}: BottomStatusRailProps) {
  return (
    <div className="flex items-center justify-between px-9 py-3 text-sm text-neutral-200">
      {/* Left: Branch.bet link with icon */}
      <a
        href="https://branch.bet"
        className="flex items-center gap-2 text-xs text-neutral-500 transition hover:text-flux"
      >
        <svg width="16" height="16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="branchStroke" x1="18" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#34d399"/>
              <stop offset="1" stopColor="#0ea5e9"/>
            </linearGradient>
            <linearGradient id="branchFill" x1="16" y1="16" x2="46" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#d1fae5" stopOpacity="0.9"/>
              <stop offset="1" stopColor="#bae6fd" stopOpacity="0.7"/>
            </linearGradient>
          </defs>
          <path d="M20 12h12c10 0 16 5 16 13 0 5.6-3.2 9.7-8.6 11.5C43.4 38 48 42.6 48 49c0 7.8-6.2 13-15.8 13H20" stroke="url(#branchStroke)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M20 12h10c8.4 0 13 3.7 13 10.5 0 5.3-3 8.8-7.8 10.2" fill="none" stroke="url(#branchFill)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>branch.bet</span>
      </a>

      {/* Center: Empty for now */}
      <div className="flex-1" />

      {/* Right: Debug info icon */}
      <button
        onClick={onOpenDebugModal}
        className="flex items-center justify-center text-neutral-500 transition hover:text-flux"
        title="Debug Info"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </button>
    </div>
  );
}

export default BottomStatusRail;
