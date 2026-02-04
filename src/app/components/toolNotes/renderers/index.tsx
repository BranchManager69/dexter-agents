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
import streamShoutRenderer from "./streamShout";

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
  stream_public_shout: streamShoutRenderer,
  stream_shout_feed: streamShoutRenderer,
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
