# Tool Renderer Migration Status

Legend:

- ✅ – Converted to ChatKit widget renderer
- ⏳ – Legacy renderer (to be converted)
- ⚠️ – Legacy renderer earmarked for deprecation (swap flow will replace it)
- 🟡 – Super-admin only (Codex tools under evaluation for removal)

| # | Tool name | Renderer file | Status | Notes |
|---|-----------|---------------|--------|-------|
| 1 | pumpstream_live_summary | pumpstream.tsx | ✅ | ChatKit ListView for live streams |
| 2 | resolve_wallet | walletResolve.tsx | ✅ | Wallet resolver widget |
| 3 | list_my_wallets | walletList.tsx | ✅ | Wallet catalog widget |
| 4 | set_session_wallet_override | walletOverride.tsx | ✅ | Wallet override widget |
| 5 | auth_info | walletAuth.tsx | ✅ | Wallet auth widget |
| 6 | solana_list_balances | solanaBalances.tsx | ✅ | Token balances widget |
| 7 | solana_preview_sell_all | solanaPreviewSell.tsx | ⚠️ | Widget updated (planned replacement by swap flow) |
| 8 | solana_execute_buy | trade.tsx | ⚠️ | Widget updated (planned replacement by swap flow) |
| 9 | solana_execute_sell | trade.tsx | ⚠️ | Widget updated (planned replacement by swap flow) |
| 10 | solana_resolve_token | solanaToken.tsx | ✅ | Token resolver widget |
| 11 | search | search.tsx | ✅ | Search results widget |
| 12 | fetch | fetch.tsx | ✅ | Document preview widget |
| 13 | codex_start | codex.tsx | ✅ | Super-admin widget (session start) |
| 14 | codex_reply | codex.tsx | ✅ | Super-admin widget (follow-up) |
| 15 | codex_exec | codex.tsx | ✅ | Super-admin widget (exec) |
| 16 | stream_get_scene | streamScene.tsx | ✅ | Stream scene widget |
| 17 | stream_set_scene | streamScene.tsx | ✅ | Stream scene update widget |
| 18 | solana_swap_preview | solanaSwap.tsx | ✅ | Swap preview widget |
| 19 | solana_swap_execute | solanaSwap.tsx | ✅ | Swap execution widget |

Last updated: October 7, 2025
