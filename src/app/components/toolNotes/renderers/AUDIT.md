# Renderer Audit Report

Generated: 2026-01-28
Updated: 2026-01-28 (added polling, fixed streamShout)

## Summary

**Total renderer files**: 22 (including new `streamShout.tsx`)
**Using sleek design system**: 22 ✅
**Using old patterns**: 0 ✅
**With real-time polling**: 2 (`mediaJobs.tsx`, `x402Dynamic.tsx`)

## Tier 1 - Excellent Quality (with animations & polling)

| File | Renderers | Design System | Animations | Polling | Status |
|------|-----------|---------------|------------|---------|--------|
| `pokedexter.tsx` | 9 | ✅ Full | ✅ Rich | — | Excellent |
| `hyperliquid.tsx` | 5 | ✅ Full | ✅ Rich | — | Excellent |
| `studio.tsx` | 7 | ✅ Full | ✅ Rich | — | Excellent |
| `mediaJobs.tsx` | 2 | ✅ Full | ✅ Rich | ✅ Auto-poll | Excellent |
| `x402Dynamic.tsx` | 7 | ✅ Full | ✅ Animated | ✅ Auto-poll | Excellent |
| `streamShout.tsx` | 1 | ✅ Full | ✅ Rich | — | **NEW** Excellent |
| `solanaBalances.tsx` | 1 | ✅ Full | ✅ Some | — | Excellent |
| `solanaSwap.tsx` | 2 | ✅ Full | ✅ Some | — | Excellent |
| `search.tsx` | 1 | ✅ Full | ✅ Some | — | Excellent |
| `pumpstream.tsx` | 1 | ✅ Full | ✅ Some | — | Excellent |
| `twitterSearch.tsx` | 1 | ✅ Full | ✅ AnimatePresence | — | Excellent |

## Tier 2 - Good Quality (sleek, minimal animations)

| File | Renderers | Design System | Animations | Notes |
|------|-----------|---------------|------------|-------|
| `trading.tsx` | 2 | ✅ Full | 🟡 Minimal | Could add chart interactions |
| `onchain.tsx` | 2 | ✅ Full | 🟡 Bar only | Could add list stagger |
| `solanaSend.tsx` | 1 | ✅ Full | 🟡 Minimal | Functional but static |
| `walletList.tsx` | 1 | ✅ Full | 🟡 LayoutGroup | Good but could pulse on default |
| `fetch.tsx` | 1 | ✅ Full | ❌ None | Could add image fade-in |

## Tier 3 - Acceptable Quality (sleek, no animations)

| File | Renderers | Design System | Animations | Notes |
|------|-----------|---------------|------------|-------|
| `walletResolve.tsx` | 1 | ✅ Full | ❌ None | Functional |
| `walletOverride.tsx` | 1 | ✅ Full | ❌ None | Could animate status change |
| `walletAuth.tsx` | 1 | ✅ Full | ❌ None | Functional |
| `identity.tsx` | 3 | ✅ Full | ❌ None | Stars could animate |
| `bundles.tsx` | 5 | ✅ Full | ❌ None | List could stagger |

## ~~Tier 4 - Needs Upgrade~~ ✅ RESOLVED

| Location | Renderer | Resolution |
|----------|----------|------------|
| ~~`index.tsx`~~ | ~~`streamPublicShoutRenderer`~~ | ✅ Extracted to `streamShout.tsx` with full sleek design |

## Recent Changes

### 2026-01-28 Updates

1. **Created `motionPresets.ts`** - Shared animation presets for consistency
2. **Created `useJobPolling.ts`** - Reusable polling hook with exponential backoff
3. **Extracted `streamShout.tsx`** - Refactored from inline to dedicated file
4. **Updated `mediaJobs.tsx`** - Added real-time polling for video/meme generation
5. **Updated `x402Dynamic.tsx`** - Added real-time polling for async jobs

## Recommended Future Actions

### Nice-to-have (future polish)
1. Add entrance animations to `identity.tsx` (star rating reveal)
2. Add list stagger to `bundles.tsx`
3. Add status pulse to `walletOverride.tsx`
4. Add image fade-in to `fetch.tsx`
5. Add polling to `studio.tsx` for job status updates

## Design System Usage

All modern renderers should import from:
- `sleekVisuals.tsx` - SleekCard, SleekLabel, MetricItem, SleekHash, SleekLoadingCard, SleekErrorCard, TokenIconSleek
- `helpers.tsx` - normalizeOutput, unwrapStructured, formatTimestampDisplay
- `motionPresets.ts` - Shared animation patterns
- `useJobPolling.ts` - Real-time polling for async jobs

## Motion Presets Available

```typescript
import { presets, transitions, variants, borderPulse, staggerDelay, colors } from "./motionPresets";

// Ready-to-use presets
presets.pulse        // scale 1 → 1.1 → 1
presets.spin         // rotate 360
presets.fadeGlow     // opacity 0.5 → 1 → 0.5
presets.fadeInUp     // entrance from below
presets.springPop    // bouncy entrance from zero

// Dynamic generators
borderPulse(colors.emerald)  // animated border color
staggerDelay(index)          // delay for list items
```

## Polling Hook Usage

```typescript
import { useJobPolling, usePollCountdown, isJobProcessing } from "./useJobPolling";

const { data, isPolling, pollCount, nextPollIn, poll, stop } = useJobPolling({
  jobId: job.id,
  status: job.status,
  toolName: "sora_video_job",
  toolArgs: { job_id: job.id },
  initialInterval: 2000,  // Start at 2s
  maxInterval: 15000,     // Max 15s with exponential backoff
  onComplete: (result) => console.log("Done!", result),
});
```
