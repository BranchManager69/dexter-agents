import type { ToolNoteRenderer } from "./types";
import pumpstreamRenderer from "./pumpstream";
import resolveWalletRenderer from "./walletResolve";
import walletListRenderer from "./walletList";
import walletOverrideRenderer from "./walletOverride";
import walletAuthRenderer from "./walletAuth";
import solanaBalancesRenderer from "./solanaBalances";
import solanaResolveTokenRenderer from "./solanaToken";
import solanaSendRenderer from "./solanaSend";
import searchRenderer from "./search";
import fetchRenderer from "./fetch";
import { codexStartRenderer, codexReplyRenderer, codexExecRenderer } from "./codex";
import { solanaSwapPreviewRenderer, solanaSwapExecuteRenderer } from "./solanaSwap";
import { onchainActivityRenderer, onchainEntityRenderer } from "./onchain";
import {
  pokedexterListChallengesRenderer,
  pokedexterGetBattleStateRenderer,
  pokedexterMakeMoveRenderer,
  pokedexterGetActiveWagerRenderer,
  pokedexterGetWagerStatusRenderer,
  pokedexterCreateChallengeRenderer,
  pokedexterAcceptChallengeRenderer,
  pokedexterJoinQueueRenderer,
  pokedexterQueueStatusRenderer,
} from "./pokedexter";
import {
  studioCreateRenderer,
  studioStatusRenderer,
  studioCancelRenderer,
  studioListRenderer,
  studioInspectRenderer,
  studioBreakingNewsRenderer,
  studioNewsStatusRenderer,
} from "./studio";
import { soraVideoJobRenderer, memeGeneratorJobRenderer } from "./mediaJobs";
import { slippageSentinelRenderer, marketsOhlcvRenderer } from "./trading";
import {
  hyperliquidMarketsRenderer,
  hyperliquidOptInRenderer,
  hyperliquidFundRenderer,
  hyperliquidDepositRenderer,
  hyperliquidPerpTradeRenderer,
} from "./hyperliquid";
import twitterSearchRenderer from "./twitterSearch";
import {
  identityStatusRenderer,
  reputationRenderer,
  feedbackRenderer,
} from "./identity";
import {
  bundleListRenderer,
  bundleDetailRenderer,
  bundleItemRenderer,
  bundleAccessRenderer,
  purchasesRenderer,
} from "./bundles";
import {
  solscanTrendingRenderer,
  jupiterQuoteRenderer,
  x402StatsRenderer,
  shieldRenderer,
  asyncJobRenderer,
  gameStateRenderer,
  testEndpointRenderer,
} from "./x402Dynamic";
import { BASE_CARD_CLASS, formatTimestampDisplay, normalizeOutput } from "./helpers";

const streamPublicShoutRenderer: ToolNoteRenderer = ({ item, debug = false }) => {
  const normalized = normalizeOutput(item.data as Record<string, unknown> | undefined) || {};
  const structured =
    (normalized as any).structured_content ??
    (normalized as any).structuredContent ??
    normalized;
  const shout = structured?.shout ?? structured;
  const alias =
    typeof shout?.alias === "string" && shout.alias.trim().length > 0
      ? shout.alias.trim()
      : null;
  const message =
    (typeof shout?.message === "string" && shout.message.trim().length > 0 ? shout.message.trim() : null) ??
    (typeof (shout as any)?.text === "string" && (shout as any).text.trim().length > 0 ? (shout as any).text.trim() : null) ??
    null;
  const expiresRaw = shout?.expires_at ?? shout?.expiresAt;
  const expiresDisplay = expiresRaw ? formatTimestampDisplay(expiresRaw) : null;

  const feed = Array.isArray(structured?.shouts)
    ? structured.shouts
    : Array.isArray(shout?.shouts)
      ? shout.shouts
      : null;

  if (feed) {
    return (
      <div className="flex flex-col gap-2">
        <div className="font-medium text-sm text-neutral-300">Recent stream shouts</div>
        <ul className="flex flex-col gap-2">
          {feed.map((entry: any) => (
            <li
              key={entry?.id || entry?.created_at || `${Math.random()}`}
              className={`${BASE_CARD_CLASS} text-sm text-neutral-200`}
            >
              {entry?.message || "—"}
              <div className="mt-1 text-xs text-neutral-500">
                {entry?.alias ? entry.alias : "Anonymous"}
                {entry?.expires_at ? ` · ${formatTimestampDisplay(entry.expires_at)}` : null}
              </div>
            </li>
          ))}
        </ul>
        {debug ? (
          <details className="mt-2 text-xs text-neutral-500" open>
            <summary className="cursor-pointer text-[11px] uppercase tracking-[0.22em] text-neutral-400">
              Raw shout feed payload
            </summary>
            <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-sm border border-neutral-800/40 bg-neutral-950/60 p-3 text-[11px] leading-tight text-neutral-300">
              {JSON.stringify(structured, null, 2)}
            </pre>
          </details>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={BASE_CARD_CLASS}>
        <div className="text-sm text-neutral-100">{message || "Shout submitted."}</div>
        <div className="mt-1 text-xs text-neutral-500">
          {alias ? `Alias: ${alias}` : "Alias: (auto-generated)"}
          {expiresDisplay ? ` · ${expiresDisplay}` : null}
        </div>
      </div>
      {debug ? (
        <details className="mt-2 text-xs text-neutral-500" open>
          <summary className="cursor-pointer text-[11px] uppercase tracking-[0.22em] text-neutral-400">
            Raw shout payload
          </summary>
          <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-sm border border-neutral-800/40 bg-neutral-950/60 p-3 text-[11px] leading-tight text-neutral-300">
            {JSON.stringify(structured, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
};

const TOOL_NOTE_RENDERERS: Record<string, ToolNoteRenderer> = {
  pumpstream_live_summary: pumpstreamRenderer,
  resolve_wallet: resolveWalletRenderer,
  list_my_wallets: walletListRenderer,
  set_session_wallet_override: walletOverrideRenderer,
  auth_info: walletAuthRenderer,
  solana_list_balances: solanaBalancesRenderer,
  solana_resolve_token: solanaResolveTokenRenderer,
  solana_send: solanaSendRenderer,
  search: searchRenderer,
  fetch: fetchRenderer,
  codex_start: codexStartRenderer,
  codex_reply: codexReplyRenderer,
  codex_exec: codexExecRenderer,
  solana_swap_preview: solanaSwapPreviewRenderer,
  solana_swap_execute: solanaSwapExecuteRenderer,
  onchain_activity_overview: onchainActivityRenderer,
  onchain_entity_insight: onchainEntityRenderer,
  // Pokedexter tools
  pokedexter_list_challenges: pokedexterListChallengesRenderer,
  pokedexter_get_battle_state: pokedexterGetBattleStateRenderer,
  pokedexter_make_move: pokedexterMakeMoveRenderer,
  pokedexter_get_active_wager: pokedexterGetActiveWagerRenderer,
  pokedexter_get_wager_status: pokedexterGetWagerStatusRenderer,
  pokedexter_create_challenge: pokedexterCreateChallengeRenderer,
  pokedexter_accept_challenge: pokedexterAcceptChallengeRenderer,
  pokedexter_join_queue: pokedexterJoinQueueRenderer,
  pokedexter_queue_status: pokedexterQueueStatusRenderer,
  // Studio tools
  studio_create: studioCreateRenderer,
  studio_status: studioStatusRenderer,
  studio_cancel: studioCancelRenderer,
  studio_list: studioListRenderer,
  studio_inspect: studioInspectRenderer,
  studio_breaking_news: studioBreakingNewsRenderer,
  studio_news_status: studioNewsStatusRenderer,
  // Media generation tools
  sora_video_job: soraVideoJobRenderer,
  meme_generator_job: memeGeneratorJobRenderer,
  // Trading/market analysis tools
  slippage_sentinel: slippageSentinelRenderer,
  markets_fetch_ohlcv: marketsOhlcvRenderer,
  // Hyperliquid tools
  hyperliquid_markets: hyperliquidMarketsRenderer,
  hyperliquid_opt_in: hyperliquidOptInRenderer,
  hyperliquid_fund: hyperliquidFundRenderer,
  hyperliquid_bridge_deposit: hyperliquidDepositRenderer,
  hyperliquid_perp_trade: hyperliquidPerpTradeRenderer,
  twitter_topic_analysis: twitterSearchRenderer,
  stream_public_shout: streamPublicShoutRenderer,
  stream_shout_feed: streamPublicShoutRenderer,
  // Identity tools
  check_identity: identityStatusRenderer,
  get_my_identity: identityStatusRenderer,
  mint_identity: identityStatusRenderer,
  get_identity_stats: identityStatusRenderer,
  get_agent_reputation: reputationRenderer,
  get_reputation_leaderboard: reputationRenderer,
  submit_feedback: feedbackRenderer,
  // Bundle tools
  list_bundles: bundleListRenderer,
  get_bundle: bundleDetailRenderer,
  get_my_bundles: bundleListRenderer,
  create_bundle: bundleDetailRenderer,
  update_bundle: bundleDetailRenderer,
  publish_bundle: bundleDetailRenderer,
  add_bundle_item: bundleItemRenderer,
  remove_bundle_item: bundleItemRenderer,
  check_bundle_access: bundleAccessRenderer,
  get_my_purchases: purchasesRenderer,
  // x402 Dynamic tools
  solscan_trending_tokens: solscanTrendingRenderer,
  tools_solscan_trending_pro: solscanTrendingRenderer,
  jupiter_quote_preview: jupiterQuoteRenderer,
  jupiter_quote_pro: jupiterQuoteRenderer,
  x402_scan_stats: x402StatsRenderer,
  shield_create: shieldRenderer,
  tools_spaces_jobs: asyncJobRenderer,
  "tools_code-interpreter_jobs": asyncJobRenderer,
  "tools_deep-research_jobs": asyncJobRenderer,
  games_king_state: gameStateRenderer,
  games_story_read: gameStateRenderer,
  "v2-test": testEndpointRenderer,
};

export function getToolNoteRenderer(toolName?: string | null): ToolNoteRenderer | undefined {
  if (!toolName) return undefined;
  const key = toolName.trim().toLowerCase();
  return TOOL_NOTE_RENDERERS[key];
}

export type { ToolNoteRenderer, ToolNoteRendererProps } from "./types";
