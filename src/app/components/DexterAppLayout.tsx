"use client";

import React from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";

import Hero from "./Hero";
import AdminDock from "./AdminDock";
import TranscriptMessages from "./TranscriptMessages";
import InputBar from "./InputBar";
import VoiceDock from "./shell/VoiceDock";
import Events from "./Events";
import DexterShell from "./shell/DexterShell";
import TopRibbon from "./shell/TopRibbon";
import BottomStatusRail from "./shell/BottomStatusRail";
import SignalStack from "./signals/SignalStack";
import SignalsDrawer from "./signals/SignalsDrawer";
import { DebugInfoModal } from "./DebugInfoModal";
import SuperAdminModal from "./SuperAdminModal";
import AgentPersonaModal from "./AgentPersonaModal";
import FloatingSessionControls from "./FloatingSessionControls";
import { ConnectionStatusControl } from "./shell/ConnectionStatusControl";

import type { SessionStatus } from "@/app/types";

import type { DexterAppController } from "../hooks/useDexterAppController";

export type DexterAppLayoutProps = DexterAppController;

export function DexterAppLayout({
  topRibbonProps,
  heroContainerClassName,
  heroTitle,
  heroSubtitle,
  heroLoading,
  heroCollapsed,
  heroControlsProps,
  transcriptProps,
  inputBarProps,
  signalStackProps,
  bottomStatusProps,
  signalsDrawerProps,
  voiceDockProps,
  debugModalProps,
  superAdminModalProps,
  personaModalProps,
}: DexterAppLayoutProps) {
  const { showLogs, toolCatalog } = signalStackProps;

  const renderSignalStack = () => (
    <SignalStack
      showLogs={showLogs}
      toolCatalog={toolCatalog}
      renderLogs={({ isExpanded }) => <Events isExpanded={isExpanded} />}
    />
  );

  const heroSection = <Hero title={heroTitle} subtitle={heroSubtitle} loading={heroLoading} />;

  const voiceDockSection = voiceDockProps ? <VoiceDock {...voiceDockProps} /> : null;

  const mobileSignalsOverlay = heroControlsProps.canUseAdminTools ? (
    <SignalsDrawer {...signalsDrawerProps}>
      {renderSignalStack()}
    </SignalsDrawer>
  ) : null;

  const desktopSignalsPanel = null;

  return (
    <>
      <DexterShell
        topBar={<TopRibbon {...topRibbonProps} />}
        hero={heroSection}
        heroCollapsed={heroCollapsed}
        heroControls={null}
        heroWrapperClassName={heroContainerClassName}
        messages={<TranscriptMessages {...transcriptProps} />}
        voiceDock={voiceDockSection}
        inputBar={<InputBar {...inputBarProps} />}
        signals={desktopSignalsPanel}
        statusBar={<BottomStatusRail {...bottomStatusProps} />}
        mobileOverlay={mobileSignalsOverlay}
      />

      <DebugInfoModal {...debugModalProps} />
      <SuperAdminModal {...superAdminModalProps} />
      <AgentPersonaModal {...personaModalProps} />
      <FloatingSessionControls
        sessionStatus={heroControlsProps.sessionStatus}
        isVoiceDockExpanded={heroControlsProps.isVoiceDockExpanded}
        onToggleVoiceDock={heroControlsProps.onToggleVoiceDock}
        onOpenSignals={heroControlsProps.onOpenSignals}
        canUseAdminTools={heroControlsProps.canUseAdminTools}
      />
      <FloatingConnectionStatus
        sessionStatus={topRibbonProps.sessionStatus}
        onToggleConnection={topRibbonProps.onToggleConnection}
        heroCollapsed={heroCollapsed}
      />
      <AdminDock
        canUseAdminTools={heroControlsProps.canUseAdminTools}
        showSuperAdminTools={heroControlsProps.showSuperAdminTools}
        onOpenSuperAdmin={heroControlsProps.onOpenSuperAdmin}
        onOpenSignals={heroControlsProps.onOpenSignals}
        onCopyTranscript={heroControlsProps.onCopyTranscript}
        onDownloadAudio={heroControlsProps.onDownloadAudio}
        onSaveLog={heroControlsProps.onSaveLog}
        renderAdminConsole={heroControlsProps.canUseAdminTools ? renderSignalStack : undefined}
        adminConsoleMetadata={{
          toolCount: toolCatalog.tools.length,
          lastUpdated: toolCatalog.lastUpdated,
          source: toolCatalog.source,
        }}
        dossierSupabaseUserId={heroControlsProps.dossierSupabaseUserId}
        userBadge={heroControlsProps.userBadge}
        onOpenPersonaModal={heroControlsProps.onOpenPersonaModal}
      />
    </>
  );
}

export default DexterAppLayout;

type FloatingConnectionStatusProps = {
  sessionStatus: SessionStatus;
  onToggleConnection?: () => void;
  heroCollapsed: boolean;
};

function FloatingConnectionStatus({
  sessionStatus,
  onToggleConnection,
  heroCollapsed,
}: FloatingConnectionStatusProps) {
  const [mounted, setMounted] = React.useState(false);
  const [position, setPosition] = React.useState({ top: 132, right: 20 });

  const updatePosition = React.useCallback(() => {
    if (typeof window === "undefined") return;

    const target = document.querySelector('[data-hero-anchor]');

    if (target instanceof HTMLElement) {
      const rect = target.getBoundingClientRect();
      const nextTop = Math.max(rect.top, 72);
      const nextRight = Math.max(window.innerWidth - rect.right, 16);

      setPosition((prev) => {
        const diffTop = Math.abs(prev.top - nextTop);
        const diffRight = Math.abs(prev.right - nextRight);
        if (diffTop < 1 && diffRight < 1) {
          return prev;
        }
        return { top: nextTop, right: nextRight };
      });
    }
  }, []);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;

    updatePosition();
    const handle = () => updatePosition();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, { passive: true });

    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle);
    };
  }, [mounted, updatePosition]);

  React.useEffect(() => {
    if (!mounted) return;
    const raf = window.requestAnimationFrame(() => updatePosition());
    return () => window.cancelAnimationFrame(raf);
  }, [mounted, heroCollapsed, sessionStatus, updatePosition]);

  if (!mounted || typeof window === "undefined") {
    return null;
  }

  return createPortal(
    <motion.div
      className="pointer-events-none fixed z-40"
      style={{ top: position.top, right: position.right + 40 }}
      initial={{ opacity: 0, y: -10, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1], delay: 0.1 }}
    >
      <div className="pointer-events-auto">
        <ConnectionStatusControl
          sessionStatus={sessionStatus}
          onToggleConnection={onToggleConnection}
        />
      </div>
    </motion.div>,
    document.body,
  );
}
