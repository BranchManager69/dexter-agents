"use client";

import React, { useState } from "react";
import { 
  ArchiveIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  LockClosedIcon,
  LockOpen1Icon,
  PlusIcon,
  MinusIcon,
} from "@radix-ui/react-icons";
import type { ToolNoteRenderer } from "./types";
import { normalizeOutput, unwrapStructured, formatTimestampDisplay } from "./helpers";
import { 
  SleekCard, 
  SleekLabel, 
  MetricItem,
  SleekLoadingCard,
  SleekErrorCard,
  SleekHash,
  formatUsdCompact,
} from "./sleekVisuals";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BundleItem = {
  id?: string;
  toolName?: string;
  tool_name?: string;
  name?: string;
  description?: string;
  type?: string;
};

type Bundle = {
  id?: string;
  bundleId?: string;
  bundle_id?: string;
  name?: string;
  description?: string;
  status?: "draft" | "published" | "archived" | "active";
  priceUsd?: number;
  price_usd?: number;
  priceSol?: number;
  price_sol?: number;
  items?: BundleItem[];
  tools?: BundleItem[];
  itemCount?: number;
  item_count?: number;
  toolCount?: number;
  tool_count?: number;
  createdAt?: string;
  created_at?: string;
  publishedAt?: string;
  published_at?: string;
  creatorId?: string;
  creator_id?: string;
  creatorName?: string;
  creator_name?: string;
  imageUrl?: string;
  image_url?: string;
  salesCount?: number;
  sales_count?: number;
  revenue?: number;
};

type BundlePayload = {
  bundle?: Bundle;
  bundles?: Bundle[];
  hasAccess?: boolean;
  has_access?: boolean;
  accessUntil?: string;
  access_until?: string;
  purchases?: Array<{
    bundleId?: string;
    bundle_id?: string;
    bundleName?: string;
    bundle_name?: string;
    purchasedAt?: string;
    purchased_at?: string;
    expiresAt?: string;
    expires_at?: string;
  }>;
  success?: boolean;
  message?: string;
  error?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getStatusColor(status?: string): string {
  switch (status) {
    case "published":
    case "active": return "text-emerald-400";
    case "draft": return "text-amber-400";
    case "archived": return "text-neutral-500";
    default: return "text-neutral-400";
  }
}

function getStatusBg(status?: string): string {
  switch (status) {
    case "published":
    case "active": return "bg-emerald-500/10 border-emerald-500/20";
    case "draft": return "bg-amber-500/10 border-amber-500/20";
    case "archived": return "bg-neutral-500/10 border-neutral-500/20";
    default: return "bg-neutral-500/10 border-neutral-500/20";
  }
}

function formatPrice(usd?: number, sol?: number): string {
  if (usd !== undefined && Number.isFinite(usd)) {
    return `$${usd.toFixed(2)}`;
  }
  if (sol !== undefined && Number.isFinite(sol)) {
    return `${sol.toFixed(4)} SOL`;
  }
  return "Free";
}

// ─────────────────────────────────────────────────────────────────────────────
// Single Bundle Card Component
// ─────────────────────────────────────────────────────────────────────────────

function BundleCard({ bundle, showDetails = false }: { bundle: Bundle; showDetails?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  
  const id = bundle.id ?? bundle.bundleId ?? bundle.bundle_id;
  const items = bundle.items ?? bundle.tools ?? [];
  const itemCount = bundle.itemCount ?? bundle.item_count ?? bundle.toolCount ?? bundle.tool_count ?? items.length;
  const priceUsd = bundle.priceUsd ?? bundle.price_usd;
  const priceSol = bundle.priceSol ?? bundle.price_sol;
  const creatorName = bundle.creatorName ?? bundle.creator_name;
  const salesCount = bundle.salesCount ?? bundle.sales_count;
  const imageUrl = bundle.imageUrl ?? bundle.image_url;
  const publishedAt = bundle.publishedAt ?? bundle.published_at;

  return (
    <div className={`p-4 rounded-sm border bg-white/[0.02] ${getStatusBg(bundle.status)} flex flex-col gap-3`}>
      <div className="flex items-start gap-3">
        {imageUrl ? (
          <img src={imageUrl} alt={bundle.name || "Bundle"} className="w-12 h-12 rounded-sm object-cover border border-white/10" />
        ) : (
          <div className="w-12 h-12 rounded-sm bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
            <ArchiveIcon className="w-6 h-6 text-violet-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-white truncate">{bundle.name || "Untitled Bundle"}</span>
            <span className="text-sm font-bold text-emerald-400 whitespace-nowrap">
              {formatPrice(priceUsd, priceSol)}
            </span>
          </div>
          {bundle.description && (
            <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">{bundle.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-500">
            <span>{itemCount} tool{itemCount !== 1 ? "s" : ""}</span>
            {creatorName && <span>by {creatorName}</span>}
            {salesCount !== undefined && <span>{salesCount} sales</span>}
          </div>
        </div>
      </div>

      {/* Expandable Tools List */}
      {showDetails && items.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between p-2 rounded-sm bg-white/[0.02] border border-white/5 text-[10px] text-neutral-400 hover:text-white transition-colors"
          >
            <span>Included Tools ({items.length})</span>
            {expanded ? <MinusIcon className="w-3 h-3" /> : <PlusIcon className="w-3 h-3" />}
          </button>
          {expanded && (
            <div className="flex flex-col gap-1 pl-2 border-l border-white/10">
              {items.map((item, idx) => (
                <div key={item.id ?? idx} className="text-[10px] text-neutral-400">
                  • {item.toolName ?? item.tool_name ?? item.name ?? "Unknown tool"}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bundle List Renderer (list_bundles, get_my_bundles)
// ─────────────────────────────────────────────────────────────────────────────

const bundleListRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as BundlePayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  const bundles = payload.bundles ?? [];

  if (bundles.length === 0) {
    return (
      <SleekCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArchiveIcon className="w-4 h-4 text-violet-400" />
          <SleekLabel>Tool Bundles</SleekLabel>
        </div>
        <div className="text-center text-neutral-500 py-6">No bundles found.</div>
      </SleekCard>
    );
  }

  return (
    <SleekCard className="p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArchiveIcon className="w-4 h-4 text-violet-400" />
          <SleekLabel>Tool Bundles</SleekLabel>
        </div>
        <span className="text-[10px] text-neutral-500">{bundles.length} bundle{bundles.length !== 1 ? "s" : ""}</span>
      </header>

      <div className="flex flex-col gap-3">
        {bundles.slice(0, 10).map((bundle, idx) => (
          <BundleCard key={bundle.id ?? bundle.bundleId ?? bundle.bundle_id ?? idx} bundle={bundle} />
        ))}
      </div>

      {bundles.length > 10 && (
        <div className="text-center text-[10px] text-neutral-500">
          +{bundles.length - 10} more bundles
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Single Bundle Renderer (get_bundle, create_bundle, update_bundle, publish_bundle)
// ─────────────────────────────────────────────────────────────────────────────

const bundleDetailRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as BundlePayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  const bundle = payload.bundle;
  
  if (!bundle) {
    // Success message (for operations like publish)
    if (payload.success || payload.message) {
      return (
        <SleekCard className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CheckCircledIcon className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-400">{payload.message || "Operation successful"}</span>
          </div>
        </SleekCard>
      );
    }
    return <SleekErrorCard message="No bundle data returned" />;
  }

  const items = bundle.items ?? bundle.tools ?? [];
  const priceUsd = bundle.priceUsd ?? bundle.price_usd;
  const priceSol = bundle.priceSol ?? bundle.price_sol;
  const createdAt = bundle.createdAt ?? bundle.created_at;
  const publishedAt = bundle.publishedAt ?? bundle.published_at;
  const imageUrl = bundle.imageUrl ?? bundle.image_url;
  const salesCount = bundle.salesCount ?? bundle.sales_count;
  const revenue = bundle.revenue;

  return (
    <SleekCard className="p-6 flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArchiveIcon className="w-4 h-4 text-violet-400" />
          <SleekLabel>Bundle Details</SleekLabel>
        </div>
        {bundle.status && (
          <span className={`px-2 py-0.5 rounded-sm text-[9px] uppercase font-bold border ${getStatusBg(bundle.status)} ${getStatusColor(bundle.status)}`}>
            {bundle.status}
          </span>
        )}
      </header>

      {/* Bundle Header */}
      <div className="flex items-start gap-4">
        {imageUrl ? (
          <img src={imageUrl} alt={bundle.name || "Bundle"} className="w-20 h-20 rounded-sm object-cover border border-white/10" />
        ) : (
          <div className="w-20 h-20 rounded-sm bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
            <ArchiveIcon className="w-10 h-10 text-violet-400" />
          </div>
        )}
        <div className="flex-1">
          <div className="text-xl font-bold text-white">{bundle.name || "Untitled Bundle"}</div>
          {bundle.description && (
            <p className="text-sm text-neutral-400 mt-1">{bundle.description}</p>
          )}
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {formatPrice(priceUsd, priceSol)}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <MetricItem label="TOOLS" value={items.length.toString()} />
        {salesCount !== undefined && <MetricItem label="SALES" value={salesCount.toLocaleString()} />}
        {revenue !== undefined && <MetricItem label="REVENUE" value={formatUsdCompact(revenue)} />}
      </div>

      {/* Included Tools */}
      {items.length > 0 && (
        <div className="flex flex-col gap-2">
          <SleekLabel>Included Tools ({items.length})</SleekLabel>
          <div className="grid grid-cols-2 gap-2">
            {items.map((item, idx) => (
              <div
                key={item.id ?? idx}
                className="p-2 rounded-sm bg-white/[0.02] border border-white/5 text-[11px]"
              >
                <span className="text-white">{item.toolName ?? item.tool_name ?? item.name ?? "Unknown"}</span>
                {item.description && (
                  <p className="text-[10px] text-neutral-500 mt-0.5 truncate">{item.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dates */}
      {(createdAt || publishedAt) && (
        <div className="flex items-center justify-between text-[10px] text-neutral-500 border-t border-white/5 pt-3">
          {createdAt && <span>Created: {formatTimestampDisplay(createdAt)}</span>}
          {publishedAt && <span>Published: {formatTimestampDisplay(publishedAt)}</span>}
        </div>
      )}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Bundle Item Renderer (add_bundle_item, remove_bundle_item)
// ─────────────────────────────────────────────────────────────────────────────

const bundleItemRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as BundlePayload & { added?: boolean; removed?: boolean; itemName?: string; item_name?: string };
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  const isAdd = (payload as any).added === true;
  const isRemove = (payload as any).removed === true;
  const itemName = (payload as any).itemName ?? (payload as any).item_name ?? "item";

  return (
    <SleekCard className="p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        {isAdd ? (
          <>
            <PlusIcon className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-400">Added &quot;{itemName}&quot; to bundle</span>
          </>
        ) : isRemove ? (
          <>
            <MinusIcon className="w-5 h-5 text-rose-400" />
            <span className="text-sm text-rose-400">Removed &quot;{itemName}&quot; from bundle</span>
          </>
        ) : (
          <>
            <CheckCircledIcon className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-400">{payload.message || "Operation successful"}</span>
          </>
        )}
      </div>

      {payload.bundle && <BundleCard bundle={payload.bundle} showDetails />}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Bundle Access Renderer (check_bundle_access)
// ─────────────────────────────────────────────────────────────────────────────

const bundleAccessRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as BundlePayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  const hasAccess = payload.hasAccess ?? payload.has_access;
  const accessUntil = payload.accessUntil ?? payload.access_until;

  return (
    <SleekCard className="p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasAccess ? <LockOpen1Icon className="w-4 h-4 text-emerald-400" /> : <LockClosedIcon className="w-4 h-4 text-rose-400" />}
          <SleekLabel>Bundle Access</SleekLabel>
        </div>
      </header>

      <div className={`p-4 rounded-sm border ${hasAccess ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {hasAccess ? (
              <CheckCircledIcon className="w-6 h-6 text-emerald-400" />
            ) : (
              <CrossCircledIcon className="w-6 h-6 text-rose-400" />
            )}
            <div>
              <div className={`text-lg font-bold ${hasAccess ? "text-emerald-400" : "text-rose-400"}`}>
                {hasAccess ? "Access Granted" : "No Access"}
              </div>
              {accessUntil && hasAccess && (
                <div className="text-xs text-neutral-500">
                  Valid until: {formatTimestampDisplay(accessUntil)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {payload.bundle && <BundleCard bundle={payload.bundle} />}

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Purchases Renderer (get_my_purchases)
// ─────────────────────────────────────────────────────────────────────────────

const purchasesRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const rawOutput = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const payload = unwrapStructured(rawOutput) as BundlePayload;
  const timestamp = formatTimestampDisplay(item.timestamp);

  if (item.status === "IN_PROGRESS") return <SleekLoadingCard />;
  
  if (payload.error) {
    return <SleekErrorCard message={payload.error} />;
  }

  const purchases = payload.purchases ?? [];

  if (purchases.length === 0) {
    return (
      <SleekCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArchiveIcon className="w-4 h-4 text-violet-400" />
          <SleekLabel>My Purchases</SleekLabel>
        </div>
        <div className="text-center text-neutral-500 py-6">No purchases found.</div>
      </SleekCard>
    );
  }

  return (
    <SleekCard className="p-6 flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArchiveIcon className="w-4 h-4 text-violet-400" />
          <SleekLabel>My Purchases</SleekLabel>
        </div>
        <span className="text-[10px] text-neutral-500">{purchases.length} purchase{purchases.length !== 1 ? "s" : ""}</span>
      </header>

      <div className="flex flex-col gap-2">
        {purchases.map((purchase, idx) => {
          const bundleName = purchase.bundleName ?? purchase.bundle_name;
          const purchasedAt = purchase.purchasedAt ?? purchase.purchased_at;
          const expiresAt = purchase.expiresAt ?? purchase.expires_at;
          const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

          return (
            <div
              key={purchase.bundleId ?? purchase.bundle_id ?? idx}
              className={`p-3 rounded-sm border ${isExpired ? "bg-neutral-500/10 border-neutral-500/20" : "bg-emerald-500/5 border-emerald-500/20"}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${isExpired ? "text-neutral-500" : "text-white"}`}>
                  {bundleName ?? "Unknown Bundle"}
                </span>
                {isExpired ? (
                  <span className="text-[9px] text-neutral-500 uppercase">Expired</span>
                ) : (
                  <CheckCircledIcon className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-[10px] text-neutral-500">
                {purchasedAt && <span>Purchased: {formatTimestampDisplay(purchasedAt)}</span>}
                {expiresAt && <span>Expires: {formatTimestampDisplay(expiresAt)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {debug && (
        <details className="mt-2 border border-white/5 bg-black/50 p-4 rounded-sm text-xs text-neutral-500 font-mono">
          <summary className="cursor-pointer hover:text-white transition-colors">Raw Payload</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(rawOutput, null, 2)}</pre>
        </details>
      )}
    </SleekCard>
  );
};

export {
  bundleListRenderer,
  bundleDetailRenderer,
  bundleItemRenderer,
  bundleAccessRenderer,
  purchasesRenderer,
};
