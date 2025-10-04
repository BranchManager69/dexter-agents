"use client";

import React from "react";

import Hero from "./Hero";
import HeroControls from "./HeroControls";
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

import type { DexterAppController } from "../hooks/useDexterAppController";

export type DexterAppLayoutProps = DexterAppController;

export function DexterAppLayout({
  topRibbonProps,
  heroContainerClassName,
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
}: DexterAppLayoutProps) {
  const { showLogs, toolCatalog } = signalStackProps;

  const renderSignalStack = () => (
    <SignalStack
      showLogs={showLogs}
      toolCatalog={toolCatalog}
      renderLogs={({ isExpanded }) => <Events isExpanded={isExpanded} />}
    />
  );

  const heroSection = <Hero />;

  const heroControlsSection = (
    <HeroControls
      {...heroControlsProps}
      renderAdminConsole={heroControlsProps.canUseAdminTools ? renderSignalStack : undefined}
      adminConsoleMetadata={{
        toolCount: toolCatalog.tools.length,
        lastUpdated: toolCatalog.lastUpdated,
        source: toolCatalog.source,
      }}
    />
  );

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
        heroControls={heroControlsSection}
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
    </>
  );
}

export default DexterAppLayout;
