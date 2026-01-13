"use client";

import React from "react";

import Hero from "./Hero";
import AdminDock from "./AdminDock";
import TranscriptMessages from "./TranscriptMessages";
import InputBar from "./InputBar";
import Events from "./Events";
import DexterShell from "./shell/DexterShell";
import TopRibbon from "./shell/TopRibbon";
import BottomStatusRail from "./shell/BottomStatusRail";
import SignalStack from "./signals/SignalStack";
import SignalsDrawer from "./signals/SignalsDrawer";
import { DebugInfoModal } from "./DebugInfoModal";
import SuperAdminModal from "./SuperAdminModal";
import AgentPersonaModal from "./AgentPersonaModal";
import VadControlPanel from "./shell/VadControlPanel";

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
  debugModalProps,
  superAdminModalProps,
  personaModalProps,
  vadPanelProps,
  hasConnectedOnce,
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
        inputBar={<InputBar {...inputBarProps} />}
        signals={desktopSignalsPanel}
        statusBar={<BottomStatusRail {...bottomStatusProps} />}
        mobileOverlay={mobileSignalsOverlay}
      />

      <DebugInfoModal {...debugModalProps} />
      <SuperAdminModal {...superAdminModalProps} />
      <AgentPersonaModal {...personaModalProps} />
      <VadControlPanel {...vadPanelProps} />
      {/* Connection status moved to BottomStatusRail */}
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
