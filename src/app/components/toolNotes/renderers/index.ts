import type { ToolNoteRenderer } from "./types";
import pumpstreamRenderer from "./pumpstream";
import resolveWalletRenderer from "./walletResolve";
import walletListRenderer from "./walletList";
import walletOverrideRenderer from "./walletOverride";
import walletAuthRenderer from "./walletAuth";
import solanaBalancesRenderer from "./solanaBalances";
import solanaPreviewSellRenderer from "./solanaPreviewSell";
import { solanaExecuteBuyRenderer, solanaExecuteSellRenderer } from "./trade";
import solanaResolveTokenRenderer from "./solanaToken";
import searchRenderer from "./search";
import fetchRenderer from "./fetch";
import { codexStartRenderer, codexReplyRenderer, codexExecRenderer } from "./codex";
import { streamGetSceneRenderer, streamSetSceneRenderer } from "./streamScene";

const TOOL_NOTE_RENDERERS: Record<string, ToolNoteRenderer> = {
  pumpstream_live_summary: pumpstreamRenderer,
  resolve_wallet: resolveWalletRenderer,
  list_my_wallets: walletListRenderer,
  set_session_wallet_override: walletOverrideRenderer,
  auth_info: walletAuthRenderer,
  solana_list_balances: solanaBalancesRenderer,
  solana_preview_sell_all: solanaPreviewSellRenderer,
  solana_execute_buy: solanaExecuteBuyRenderer,
  solana_execute_sell: solanaExecuteSellRenderer,
  solana_resolve_token: solanaResolveTokenRenderer,
  search: searchRenderer,
  fetch: fetchRenderer,
  codex_start: codexStartRenderer,
  codex_reply: codexReplyRenderer,
  codex_exec: codexExecRenderer,
  stream_get_scene: streamGetSceneRenderer,
  stream_set_scene: streamSetSceneRenderer,
};

export function getToolNoteRenderer(toolName?: string | null): ToolNoteRenderer | undefined {
  if (!toolName) return undefined;
  const key = toolName.trim().toLowerCase();
  return TOOL_NOTE_RENDERERS[key];
}

export type { ToolNoteRenderer, ToolNoteRendererProps } from "./types";
