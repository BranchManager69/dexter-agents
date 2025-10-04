"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ResolvedConciergeProfile } from "@/app/agentConfigs/customerServiceRetail/promptProfile";

export type PromptToolSlugMap = Record<string, string>;

export type PromptProfileRecord = {
  id: string;
  name: string;
  description: string | null;
  instructionSlug: string;
  handoffSlug: string;
  guestSlug: string;
  toolSlugs: PromptToolSlugMap;
  voiceKey: string | null;
  metadata: Record<string, any>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PromptProfileDraft = {
  id?: string;
  name: string;
  description?: string | null;
  instructionSlug: string;
  handoffSlug: string;
  guestSlug: string;
  toolSlugs: PromptToolSlugMap;
  voiceKey?: string | null;
  metadata?: Record<string, any>;
  isDefault?: boolean;
};

export type PromptProfileManager = {
  profiles: PromptProfileRecord[];
  loading: boolean;
  activeResolvedProfile: ResolvedConciergeProfile | null;
  refresh: () => Promise<void>;
  createProfile: (draft: PromptProfileDraft) => Promise<PromptProfileRecord>;
  updateProfile: (id: string, draft: PromptProfileDraft) => Promise<PromptProfileRecord>;
  deleteProfile: (id: string) => Promise<void>;
  activateProfile: (id: string) => Promise<void>;
  previewProfile: (draft: PromptProfileDraft) => Promise<ResolvedConciergeProfile>;
};

async function handleJson(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  throw new Error(text || `Request failed (${response.status})`);
}

function normalizeDraft(draft: PromptProfileDraft): PromptProfileDraft {
  return {
    ...draft,
    instructionSlug: draft.instructionSlug.trim(),
    handoffSlug: draft.handoffSlug.trim(),
    guestSlug: draft.guestSlug.trim(),
    toolSlugs: Object.fromEntries(
      Object.entries(draft.toolSlugs || {}).map(([key, value]) => [key, value.trim()])
    ),
    name: draft.name.trim(),
    description: draft.description?.trim() ?? null,
    voiceKey: draft.voiceKey?.trim() || null,
  };
}

export function usePromptProfiles(): PromptProfileManager {
  const [profiles, setProfiles] = useState<PromptProfileRecord[]>([]);
  const [activeResolvedProfile, setActiveResolvedProfile] = useState<ResolvedConciergeProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, activeRes] = await Promise.all([
        fetch("/api/prompt-profiles", {
          method: "GET",
          credentials: "include",
        }),
        fetch("/api/prompt-profiles/active", {
          method: "GET",
          credentials: "include",
        }),
      ]);

      if (!listRes.ok) {
        throw await handleJson(listRes);
      }
      if (!activeRes.ok) {
        throw await handleJson(activeRes);
      }

      const listData = await listRes.json();
      const activeData = await activeRes.json();

      setProfiles(Array.isArray(listData?.profiles) ? listData.profiles : []);
      setActiveResolvedProfile(activeData?.resolvedProfile ?? null);
    } catch (error) {
      console.error("Failed to load prompt profiles", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createProfile = useCallback(async (draft: PromptProfileDraft) => {
    const normalized = normalizeDraft(draft);
    const response = await fetch("/api/prompt-profiles", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: normalized.name,
        description: normalized.description,
        instructionSlug: normalized.instructionSlug,
        handoffSlug: normalized.handoffSlug,
        guestSlug: normalized.guestSlug,
        toolSlugs: normalized.toolSlugs,
        voiceKey: normalized.voiceKey,
        metadata: normalized.metadata ?? {},
        isDefault: normalized.isDefault ?? false,
      }),
    });
    if (!response.ok) {
      throw await handleJson(response);
    }
    const data = await response.json();
    const created = data?.profile as PromptProfileRecord;
    setProfiles((prev) => [...prev, created]);
    if (data?.resolvedProfile) {
      setActiveResolvedProfile(data.resolvedProfile);
    }
    return created;
  }, []);

  const updateProfile = useCallback(async (id: string, draft: PromptProfileDraft) => {
    const normalized = normalizeDraft(draft);
    const response = await fetch(`/api/prompt-profiles/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: normalized.name,
        description: normalized.description,
        instructionSlug: normalized.instructionSlug,
        handoffSlug: normalized.handoffSlug,
        guestSlug: normalized.guestSlug,
        toolSlugs: normalized.toolSlugs,
        voiceKey: normalized.voiceKey,
        metadata: normalized.metadata ?? {},
        isDefault: normalized.isDefault ?? false,
      }),
    });
    if (!response.ok) {
      throw await handleJson(response);
    }
    const data = await response.json();
    const updated = data?.profile as PromptProfileRecord;
    setProfiles((prev) => prev.map((profile) => (profile.id === updated.id ? updated : profile)));
    if (data?.resolvedProfile) {
      setActiveResolvedProfile(data.resolvedProfile);
    }
    return updated;
  }, []);

  const deleteProfile = useCallback(async (id: string) => {
    const response = await fetch(`/api/prompt-profiles/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      throw await handleJson(response);
    }
    setProfiles((prev) => prev.filter((profile) => profile.id !== id));
    await refresh();
  }, [refresh]);

  const activateProfile = useCallback(async (id: string) => {
    const response = await fetch(`/api/prompt-profiles/${id}/activate`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      throw await handleJson(response);
    }
    await refresh();
  }, [refresh]);

  const previewProfile = useCallback(async (draft: PromptProfileDraft) => {
    const normalized = normalizeDraft(draft);
    const response = await fetch("/api/prompt-profiles/preview", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: normalized.name,
        description: normalized.description,
        instructionSlug: normalized.instructionSlug,
        handoffSlug: normalized.handoffSlug,
        guestSlug: normalized.guestSlug,
        toolSlugs: normalized.toolSlugs,
        voiceKey: normalized.voiceKey,
        metadata: normalized.metadata ?? {},
        isDefault: normalized.isDefault ?? false,
      }),
    });
    if (!response.ok) {
      throw await handleJson(response);
    }
    const data = await response.json();
    return data?.resolvedProfile as ResolvedConciergeProfile;
  }, []);

  return useMemo(
    () => ({
      profiles,
      loading,
      activeResolvedProfile,
      refresh,
      createProfile,
      updateProfile,
      deleteProfile,
      activateProfile,
      previewProfile,
    }),
    [
      profiles,
      loading,
      activeResolvedProfile,
      refresh,
      createProfile,
      updateProfile,
      deleteProfile,
      activateProfile,
      previewProfile,
    ],
  );
}
