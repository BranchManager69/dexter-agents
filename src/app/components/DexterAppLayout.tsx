"use client";

import React from "react";

import Hero from "./Hero";
import HeroControls from "./HeroControls";
import TranscriptMessages from "./TranscriptMessages";
import InputBar from "./InputBar";
import Events from "./Events";
import DexterShell from "./shell/DexterShell";
import TopRibbon from "./shell/TopRibbon";
import VoiceDock from "./shell/VoiceDock";
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

  const heroSection = (
    <div className={heroContainerClassName}>
      <Hero />
      <HeroControls {...heroControlsProps} />
    </div>
  );

  const voiceDockSection = voiceDockProps ? <VoiceDock {...voiceDockProps} /> : null;

  return (
    <>
      <DexterShell
        topBar={<TopRibbon {...topRibbonProps} />}
        hero={heroSection}
        messages={<TranscriptMessages {...transcriptProps} />}
        inputBar={<InputBar {...inputBarProps} />}
        signals={renderSignalStack()}
        statusBar={<BottomStatusRail {...bottomStatusProps} />}
        voiceDock={voiceDockSection}
        mobileOverlay={
          <SignalsDrawer {...signalsDrawerProps}>
            {renderSignalStack()}
          </SignalsDrawer>
        }
      />

      <DebugInfoModal {...debugModalProps} />
      <SuperAdminModal {...superAdminModalProps} />
    </>
  );
}

export default DexterAppLayout;
