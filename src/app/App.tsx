"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

// UI components
import Hero from "./components/Hero";
import TranscriptMessages from "./components/TranscriptMessages";
import InputBar from "./components/InputBar";
import Events from "./components/Events";
import DexterShell from "./components/shell/DexterShell";
import TopRibbon from "./components/shell/TopRibbon";
import VoiceDock from "./components/shell/VoiceDock";
import SuperAdminModal from "./components/SuperAdminModal";
import BottomStatusRail from "./components/shell/BottomStatusRail";
import SignalStack from "./components/signals/SignalStack";
import SignalsDrawer from "./components/signals/SignalsDrawer";
import { DebugInfoModal } from "./components/DebugInfoModal";

declare global {
  interface Window {
    __DEXTER_DISABLE_SYNTHETIC_GREETING?: boolean;
  }
}

// Types
import { SessionStatus } from "@/app/types";
import type { RealtimeAgent } from '@openai/agents/realtime';

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "./hooks/useRealtimeSession";
import { createModerationGuardrail } from "@/app/agentConfigs/guardrails";
import { useSignalData } from "./hooks/useSignalData";
import { useAuth } from "./auth-context";

type DexterSessionUser = {
  id?: string | null;
  email?: string | null;
  roles?: string[];
  isSuperAdmin?: boolean;
};

export type DexterSessionSummary = {
  type: "guest" | "user";
  user: DexterSessionUser | null;
  guestProfile?: { label?: string; instructions?: string } | null;
  wallet?: { public_key: string | null; label?: string | null } | null;
};

type McpStatusState = {
  state: "loading" | "user" | "fallback" | "guest" | "none" | "error";
  label: string;
  detail?: string;
};

const GUEST_SESSION_INSTRUCTIONS =
  "Operate using the shared Dexter demo wallet with limited funds. Avoid destructive actions and encourage the user to sign in for persistent access.";

const createGuestIdentity = (): DexterSessionSummary => ({
  type: "guest",
  user: null,
  guestProfile: { label: "Dexter Demo Wallet", instructions: GUEST_SESSION_INSTRUCTIONS },
  wallet: null,
});

// Agent configs
import { scenarioLoaders, defaultAgentSetKey } from "@/app/agentConfigs";
import { dexterTradingCompanyName } from "@/app/agentConfigs/customerServiceRetail";

import useAudioDownload from "./hooks/useAudioDownload";
import { useHandleSessionHistory } from "./hooks/useHandleSessionHistory";
import {
  getMcpStatusSnapshot,
  setMcpStatusError,
  subscribeMcpStatus,
  updateMcpStatusFromPayload,
} from "./state/mcpStatusStore";
import { useToolCatalog } from "./hooks/useToolCatalog";

function App() {
  const searchParams = useSearchParams()!;
  const {
    session: authSession,
    loading: authLoading,
    signOut: authSignOut,
    sendMagicLink,
  } = useAuth();

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const [sessionIdentity, setSessionIdentity] = useState<DexterSessionSummary>(createGuestIdentity);
  const [mcpStatus, setMcpStatus] = useState<McpStatusState>(getMcpStatusSnapshot());
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);

  const authEmail = useMemo(() => {
    if (!authSession) return null;
    return (
      (authSession.user.email as string | null | undefined) ??
      (authSession.user.user_metadata?.email as string | null | undefined) ??
      null
    );
  }, [authSession]);

  const resetSessionIdentity = useCallback(() => {
    setSessionIdentity(createGuestIdentity());
  }, []);

  const syncIdentityToAuthSession = useCallback((walletOverride?: { public_key: string | null; label?: string | null } | null) => {
    if (!authSession) {
      resetSessionIdentity();
      return;
    }

    const rawRoles = authSession.user.app_metadata?.roles as unknown;
    const roles = Array.isArray(rawRoles)
      ? rawRoles.map((value) => String(value))
      : typeof rawRoles === 'string'
        ? [rawRoles]
        : [];
    const isSuperAdmin = roles.map((r) => r.toLowerCase()).includes('superadmin');

    setSessionIdentity((current) => {
      if (
        current.type === 'user' &&
        current.user?.id === authSession.user.id &&
        current.user?.email === authSession.user.email &&
        JSON.stringify(current.user?.roles ?? []) === JSON.stringify(roles) &&
        Boolean(current.user?.isSuperAdmin) === isSuperAdmin
      ) {
        if (walletOverride === undefined) {
          return current;
        }
      }

      return {
        type: 'user',
        user: {
          id: authSession.user.id,
          email: authSession.user.email ?? null,
          roles,
          isSuperAdmin,
        },
        guestProfile: null,
        wallet:
          walletOverride !== undefined
            ? walletOverride
            : current.type === 'user'
              ? current.wallet ?? null
              : null,
      };
    });
  }, [authSession, resetSessionIdentity]);

  const fetchActiveWallet = useCallback(async () => {
    try {
      const response = await fetch('/api/wallet/active', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      const wallet = data?.wallet;
      if (wallet && typeof wallet === 'object') {
        return {
          public_key: typeof wallet.public_key === 'string' ? wallet.public_key : null,
          label: typeof wallet.label === 'string' ? wallet.label : null,
        };
      }
    } catch (error) {
      console.warn('Failed to fetch active wallet', error);
    }
    return null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateIdentity = async () => {
      if (!authSession) {
        resetSessionIdentity();
        return;
      }

      const wallet = await fetchActiveWallet();
      if (!cancelled) {
        syncIdentityToAuthSession(wallet);
      }
    };

    hydrateIdentity();

    return () => {
      cancelled = true;
    };
  }, [authSession, fetchActiveWallet, resetSessionIdentity, syncIdentityToAuthSession]);

  useEffect(() => {
    const unsubscribe = subscribeMcpStatus((snapshot) => {
      setMcpStatus({ state: snapshot.state, label: snapshot.label, detail: snapshot.detail });

      // Notify waiting callbacks if MCP is now ready
      if (snapshot.state === 'user' || snapshot.state === 'fallback' || snapshot.state === 'guest') {
        mcpReadyCallbacksRef.current.forEach(cb => cb());
        mcpReadyCallbacksRef.current = [];
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    fetch("/api/mcp/status", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => updateMcpStatusFromPayload(data || {}))
      .catch(() => setMcpStatusError());
  }, [sessionIdentity.type, sessionIdentity.user?.id, sessionIdentity.guestProfile?.label]);

  // ---------------------------------------------------------------------
  // Codec selector – lets you toggle between wide-band Opus (48 kHz)
  // and narrow-band PCMU/PCMA (8 kHz) to hear what the agent sounds like on
  // a traditional phone line and to validate ASR / VAD behaviour under that
  // constraint.
  //
  // We read the `?codec=` query-param and rely on the `changePeerConnection`
  // hook (configured in `useRealtimeSession`) to set the preferred codec
  // before the offer/answer negotiation.
  // ---------------------------------------------------------------------
  const urlCodec = searchParams.get("codec") || "opus";

  // Agents SDK doesn't currently support codec selection so it is now forced 
  // via global codecPatch at module load 

  const {
    addTranscriptMessage,
    addTranscriptBreadcrumb,
  } = useTranscript();
  const { logClientEvent, logServerEvent } = useEvent();

  const [scenarioMap, setScenarioMap] = useState<Record<string, RealtimeAgent[]>>({});
  const scenarioCacheRef = useRef<Record<string, RealtimeAgent[]>>({});

  const ensureScenarioLoaded = useCallback(async (key: string) => {
    if (scenarioCacheRef.current[key]) {
      return scenarioCacheRef.current[key];
    }
    const loader = scenarioLoaders[key];
    if (!loader) {
      throw new Error(`Unknown agent set: ${key}`);
    }
    const agents = await loader();
    scenarioCacheRef.current = { ...scenarioCacheRef.current, [key]: agents };
    setScenarioMap((prev) => {
      if (prev[key]) return prev;
      return { ...prev, [key]: agents };
    });
    return agents;
  }, []);

  const scenarioAgents = scenarioMap[defaultAgentSetKey] ?? [];
  const [selectedAgentName, setSelectedAgentName] = useState<string>("");

  useEffect(() => {
    ensureScenarioLoaded(defaultAgentSetKey).catch((error) => {
      console.error('Failed to preload agent scenario', error);
    });
  }, [ensureScenarioLoaded]);

  useEffect(() => {
    if (!selectedAgentName && scenarioAgents.length > 0) {
      setSelectedAgentName(scenarioAgents[0].name);
    }
  }, [scenarioAgents, selectedAgentName]);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  // Ref to identify whether the latest agent switch came from an automatic handoff
  const handoffTriggeredRef = useRef(false);

  const sdkAudioElement = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  // Attach SDK audio element once it exists (after first render in browser)
  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const {
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    interrupt,
    mute,
  } = useRealtimeSession({
    onConnectionChange: (s) => setSessionStatus(s as SessionStatus),
    onAgentHandoff: (agentName: string) => {
      handoffTriggeredRef.current = true;
      setSelectedAgentName(agentName);
    },
  });

  const [sessionStatus, setSessionStatus] =
    useState<SessionStatus>("DISCONNECTED");
  const mcpReadyCallbacksRef = useRef<Array<() => void>>([]);

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] =
    useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isMobileSignalsOpen, setIsMobileSignalsOpen] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('audioPlaybackEnabled');
      return stored ? stored === 'true' : true;
    },
  );
  const [hasActivatedSession, setHasActivatedSession] = useState<boolean>(false);
  const [pendingAutoConnect, setPendingAutoConnect] = useState<boolean>(false);
  const [isVoiceDockExpanded, setIsVoiceDockExpanded] = useState<boolean>(true);
  const [isDebugModalOpen, setIsDebugModalOpen] = useState<boolean>(false);

  // Initialize the recording hook.
  const { startRecording, stopRecording, downloadRecording } =
    useAudioDownload();

  const signalData = useSignalData();
  const toolCatalog = useToolCatalog();

  const handleSignIn = useCallback(async (email: string, captchaToken: string | null): Promise<{ success: boolean; message: string }> => {
    try {
      const result = await sendMagicLink(email, {
        captchaToken: captchaToken ?? undefined,
      });
      return result;
    } catch (err) {
      console.error("Sign-in error:", err);
      return { success: false, message: "Something went wrong sending the magic link." };
    }
  }, [sendMagicLink]);

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
      logClientEvent(eventObj, eventNameSuffix);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  useHandleSessionHistory();

  useEffect(() => {
    if (
      sessionStatus === "CONNECTED" &&
      selectedAgentName
    ) {
      const currentAgent = scenarioAgents.find(
        (a) => a.name === selectedAgentName
      );
      addTranscriptBreadcrumb(
        `Session started with ${selectedAgentName}`,
        currentAgent ? { name: currentAgent.name } : undefined,
      );
      const isHandoff = handoffTriggeredRef.current;
      updateSession(false);
      if (!isHandoff) {
        setHasActivatedSession(false);
      }
      // Reset flag after handling so subsequent effects behave normally
      handoffTriggeredRef.current = false;
    }
  }, [scenarioAgents, selectedAgentName, sessionStatus]);

  useEffect(() => {
    if (pendingAutoConnect && sessionStatus === "DISCONNECTED" && selectedAgentName) {
      connectToRealtime();
      setPendingAutoConnect(false);
    }
  }, [pendingAutoConnect, sessionStatus, selectedAgentName]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED") {
      updateSession();
    }
  }, [isPTTActive]);

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    const tokenResponse = await fetch("/api/session", {
      method: "GET",
      credentials: "include",
      headers: authSession?.access_token
        ? {
            Authorization: `Bearer ${authSession.access_token}`,
          }
        : undefined,
    });
    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text().catch(() => "");
      console.error("Failed to fetch session token:", tokenResponse.status, errorBody);
      resetSessionIdentity();
      setSessionStatus("DISCONNECTED");
      return null;
    }

    const data = await tokenResponse.json();
    logServerEvent(data, "fetch_session_token_response");

    const dexterSession = data?.dexter_session;
    const authRolesRaw = authSession?.user?.app_metadata?.roles as unknown;
    const authRoles = Array.isArray(authRolesRaw) ? authRolesRaw.map((value) => String(value)) : [];
    const userIsSuperAdmin = authRoles.includes('superadmin');

    if (dexterSession) {
      if (dexterSession.type === "user") {
        setSessionIdentity({
          type: "user",
          user: {
            id: dexterSession.user?.id ?? null,
            email: dexterSession.user?.email ?? null,
            roles: authRoles,
            isSuperAdmin: userIsSuperAdmin,
          },
          guestProfile: null,
          wallet: dexterSession.wallet ?? null,
        });
      } else {
        setSessionIdentity({
          type: "guest",
          user: null,
          guestProfile: dexterSession.guest_profile ?? {
            label: "Dexter Demo Wallet",
            instructions: GUEST_SESSION_INSTRUCTIONS,
          },
          wallet: dexterSession.wallet ?? null,
        });
      }
    } else {
      resetSessionIdentity();
    }

    if (!data.client_secret?.value) {
      logClientEvent(data, "error.no_ephemeral_key");
      console.error("No ephemeral key provided by the server");
      setSessionStatus("DISCONNECTED");
      return null;
    }

    return data.client_secret.value;
  };

  const connectToRealtime = async () => {
    const agentSetKey = defaultAgentSetKey;
    if (sessionStatus !== "DISCONNECTED") return;
    setHasActivatedSession(false);
    setSessionStatus("CONNECTING");

    try {
      const scenario = await ensureScenarioLoaded(agentSetKey);
      if (!scenario?.length) {
        throw new Error(`No agents configured for scenario ${agentSetKey}`);
      }
      const EPHEMERAL_KEY = await fetchEphemeralKey();
      if (!EPHEMERAL_KEY) return;

      // Ensure the selectedAgentName is first so that it becomes the root
      const activeAgentName = selectedAgentName || scenario[0]?.name || '';
      if (!selectedAgentName && activeAgentName) {
        setSelectedAgentName(activeAgentName);
      }
      const reorderedAgents = [...scenario];
      const idx = reorderedAgents.findIndex((a) => a.name === activeAgentName);
      if (idx > 0) {
        const [agent] = reorderedAgents.splice(idx, 1);
        reorderedAgents.unshift(agent);
      }

      const guardrail = createModerationGuardrail(
        dexterTradingCompanyName,
      );

      await connect({
        getEphemeralKey: async () => EPHEMERAL_KEY,
        initialAgents: reorderedAgents,
        audioElement: sdkAudioElement,
        outputGuardrails: [guardrail],
      });
    } catch (err) {
      console.error("Error connecting via SDK:", err);
      setSessionStatus("DISCONNECTED");
    }
  };

  const disconnectFromRealtime = () => {
    disconnect();
    setSessionStatus("DISCONNECTED");
    setIsPTTUserSpeaking(false);
    void fetchActiveWallet().then((wallet) => {
      syncIdentityToAuthSession(wallet);
    });
    setHasActivatedSession(false);
    setPendingAutoConnect(false);
  };

  const handleSignOut = useCallback(async () => {
    try {
      await authSignOut();
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      disconnectFromRealtime();
    }
  }, [authSignOut, disconnectFromRealtime]);

  const sendSimulatedUserMessage = (text: string) => {
    const id = uuidv4().slice(0, 32);
    addTranscriptMessage(id, "user", text, true);

    sendClientEvent({
      type: 'conversation.item.create',
      item: {
        id,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });
    sendClientEvent({ type: 'response.create' }, '(simulated user text message)');
  };

  const shouldSkipSyntheticGreeting = () => {
    if (process.env.NEXT_PUBLIC_DISABLE_SYNTHETIC_GREETING === 'true') {
      return true;
    }
    if (typeof window !== 'undefined') {
      if (window.__DEXTER_DISABLE_SYNTHETIC_GREETING === true) {
        return true;
      }
      try {
        return window.localStorage?.getItem('dexter:disableSyntheticGreeting') === 'true';
      } catch (error) {
        console.warn('Failed to read synthetic greeting preference:', error);
      }
    }
    return false;
  };

  const updateSession = (shouldTriggerResponse: boolean = false) => {
    // Reflect Push-to-Talk UI state by (de)activating server VAD on the
    // backend. The Realtime SDK supports live session updates via the
    // `session.update` event.
    const turnDetection = isPTTActive
      ? null
      : {
          type: 'server_vad',
          threshold: 0.9,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
          create_response: true,
        };

    sendEvent({
      type: 'session.update',
      session: {
        turn_detection: turnDetection,
      },
    });

    // Send an initial 'hi' message to trigger the agent to greet the user
    if (shouldTriggerResponse && !shouldSkipSyntheticGreeting()) {
      sendSimulatedUserMessage('hi');
    }
    return;
  }

  const waitForMcpReady = () => {
    const currentState = mcpStatus.state;
    if (currentState === 'user' || currentState === 'fallback' || currentState === 'guest') {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MCP ready timeout'));
      }, 10000);

      mcpReadyCallbacksRef.current.push(() => {
        clearTimeout(timeout);
        resolve();
      });
    });
  };

  const handleSendTextMessage = async (directMessage?: string) => {
    // Use provided message or fall back to state
    const messageToSend = (directMessage || userText).trim();
    if (!messageToSend) return;

    setUserText("");

    // If not connected, connect first
    if (sessionStatus !== 'CONNECTED') {
      try {
        await connectToRealtime();
      } catch (err) {
        console.error('Failed to connect', err);
        setUserText(messageToSend);
        return;
      }
    }

    // Wait for MCP to be ready
    try {
      await waitForMcpReady();
    } catch (err) {
      console.error('MCP not ready, aborting message send', err);
      setUserText(messageToSend);
      return;
    }

    interrupt();
    setHasActivatedSession(true);

    try {
      sendUserText(messageToSend);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  const handleTalkButtonDown = () => {
    if (sessionStatus !== 'CONNECTED') return;
    interrupt();
    setHasActivatedSession(true);

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear PTT buffer');

    // No placeholder; we'll rely on server transcript once ready.
  };

  const handleTalkButtonUp = () => {
    if (sessionStatus !== 'CONNECTED' || !isPTTUserSpeaking)
      return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: 'input_audio_buffer.commit' }, 'commit PTT');
    sendClientEvent({ type: 'response.create' }, 'trigger response PTT');
  };

  const onToggleConnection = () => {
    if (sessionStatus === "CONNECTED" || sessionStatus === "CONNECTING") {
      disconnectFromRealtime();
      setSessionStatus("DISCONNECTED");
    } else {
      setHasActivatedSession(false);
      connectToRealtime();
    }
  };

  const handleSelectedAgentChange = (newAgentName: string) => {
    // Reconnect session with the newly selected agent as root so that tool
    // execution works correctly.
    disconnectFromRealtime();
    setSelectedAgentName(newAgentName);
    setHasActivatedSession(false);
    setPendingAutoConnect(true);
  };

  // Because we need a new connection, refresh the page when codec changes
  const handleCodecChange = (newCodec: string) => {
    const url = new URL(window.location.toString());
    url.searchParams.set("codec", newCodec);
    window.location.replace(url.toString());
  };

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem(
      "audioPlaybackEnabled"
    );
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem(
      "audioPlaybackEnabled",
      isAudioPlaybackEnabled.toString()
    );
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        // Mute and pause to avoid brief audio blips before pause takes effect.
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
      }
    }

    // Toggle server-side audio stream mute so bandwidth is saved when the
    // user disables playback. 
    try {
      mute(!isAudioPlaybackEnabled);
    } catch (err) {
      console.warn('Failed to toggle SDK mute', err);
    }
  }, [isAudioPlaybackEnabled]);

  // Ensure mute state is propagated to transport right after we connect or
  // whenever the SDK client reference becomes available.
  useEffect(() => {
    if (sessionStatus === 'CONNECTED') {
      try {
        mute(!isAudioPlaybackEnabled);
      } catch (err) {
        console.warn('mute sync after connect failed', err);
      }
    }
  }, [sessionStatus, isAudioPlaybackEnabled]);

  useEffect(() => {
    if (sessionStatus === "CONNECTED" && audioElementRef.current?.srcObject) {
      // The remote audio stream from the audio element.
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    // Clean up on unmount or when sessionStatus is updated.
    return () => {
      stopRecording();
    };
  }, [sessionStatus]);

  const { transcriptItems } = useTranscript();
  const { loggedEvents } = useEvent();

  const handleSaveLog = () => {
    try {
      const artifact = {
        timestamp: new Date().toISOString(),
        source: "live",
        structured: {
          transcripts: transcriptItems,
          events: loggedEvents,
        },
        meta: {
          assistantMessageCount: transcriptItems.filter(
            (item) => item.type === "MESSAGE" && item.role === "assistant" && !item.isHidden,
          ).length,
          userMessageCount: transcriptItems.filter(
            (item) => item.type === "MESSAGE" && item.role === "user",
          ).length,
          generatedAt: new Date().toLocaleString(),
        },
      };

      const blob = new Blob([JSON.stringify(artifact, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `live-${artifact.timestamp.replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      requestAnimationFrame(() => {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.error("Failed to save run artifact:", error);
    }
  };

  const handleCopyTranscript = async () => {
    const transcriptRef = document.querySelector('[data-transcript-messages]');
    if (transcriptRef) {
      await navigator.clipboard.writeText(transcriptRef.textContent || '');
    }
  };

  const normalizedRoles = (sessionIdentity.user?.roles ?? []).map((role) => (typeof role === 'string' ? role.toLowerCase() : String(role || '').toLowerCase()));
  const isSuperAdmin = Boolean(sessionIdentity.user?.isSuperAdmin || normalizedRoles.includes('superadmin'));
  const canUseAdminTools = sessionIdentity.type === 'user' && (isSuperAdmin || normalizedRoles.includes('admin'));

  const hero = (
    <Hero
      sessionStatus={sessionStatus}
      onOpenSignals={() => setIsMobileSignalsOpen(true)}
      onCopyTranscript={handleCopyTranscript}
      onDownloadAudio={downloadRecording}
      onSaveLog={handleSaveLog}
      isVoiceDockExpanded={isVoiceDockExpanded}
      onToggleVoiceDock={() => setIsVoiceDockExpanded(!isVoiceDockExpanded)}
      canUseAdminTools={canUseAdminTools}
      showSuperAdminTools={isSuperAdmin}
      onOpenSuperAdmin={() => setIsSuperAdminModalOpen(true)}
    />
  );

  const voiceDock = sessionStatus === "CONNECTED" && isVoiceDockExpanded ? (
    <VoiceDock
      sessionStatus={sessionStatus}
      isPTTActive={isPTTActive}
      isPTTUserSpeaking={isPTTUserSpeaking}
      onTogglePTT={setIsPTTActive}
      onTalkStart={handleTalkButtonDown}
      onTalkEnd={handleTalkButtonUp}
    />
  ) : null;

  const messages = (
    <TranscriptMessages
      hasActivatedSession={hasActivatedSession}
      onSendMessage={(message) => handleSendTextMessage(message)}
    />
  );

  const inputBar = (
    <InputBar
      userText={userText}
      setUserText={setUserText}
      onSendMessage={handleSendTextMessage}
      canSend={sessionStatus !== 'CONNECTING'}
    />
  );

  const renderSignalStack = () => (
    <SignalStack
      showLogs={isEventsPaneExpanded}
      logs={<Events isExpanded={isEventsPaneExpanded} />}
      marketPulse={signalData.marketPulse}
      pumpStreams={signalData.pumpStreams}
      wallet={signalData.wallet}
      toolCatalog={toolCatalog}
    />
  );

  const statusRail = (
    <BottomStatusRail
      onOpenDebugModal={() => setIsDebugModalOpen(true)}
    />
  );

  const mobileSignalsOverlay = (
    <SignalsDrawer
      open={isMobileSignalsOpen}
      onClose={() => setIsMobileSignalsOpen(false)}
    >
      {renderSignalStack()}
    </SignalsDrawer>
  );

  return (
    <>
      <DexterShell
        topBar={
          <TopRibbon
            sessionStatus={sessionStatus}
            selectedAgentName={selectedAgentName}
            agents={scenarioAgents}
            onAgentChange={handleSelectedAgentChange}
            onToggleConnection={onToggleConnection}
            onReloadBrand={() => window.location.reload()}
            authState={{
              loading: authLoading,
              isAuthenticated: Boolean(authSession),
              email: authEmail,
            }}
            sessionIdentity={sessionIdentity}
            mcpStatus={mcpStatus}
            activeWalletKey={signalData.wallet.summary.activeWallet ?? null}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
            turnstileSiteKey={turnstileSiteKey}
          />
        }
        hero={hero}
        messages={messages}
        inputBar={inputBar}
        signals={renderSignalStack()}
        statusBar={statusRail}
        voiceDock={voiceDock}
        mobileOverlay={mobileSignalsOverlay}
      />

      {/* Debug Modal - accessible from both TopRibbon and Footer */}
      <DebugInfoModal
        open={isDebugModalOpen}
        onClose={() => setIsDebugModalOpen(false)}
        connectionStatus={sessionStatus}
        identityLabel={sessionIdentity.type === "user"
          ? sessionIdentity.user?.email?.split("@")[0] || "User"
          : "Demo"}
        mcpStatus={mcpStatus.label}
        walletStatus={signalData.wallet.summary.activeWallet || "Auto"}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
        isEventsPaneExpanded={isEventsPaneExpanded}
        setIsEventsPaneExpanded={setIsEventsPaneExpanded}
        codec={urlCodec}
        onCodecChange={handleCodecChange}
        buildTag={process.env.NEXT_PUBLIC_BUILD_TAG ?? "dev"}
      />

      <SuperAdminModal
        open={isSuperAdminModalOpen}
        onClose={() => setIsSuperAdminModalOpen(false)}
      />
    </>
  );
}

export default App;
