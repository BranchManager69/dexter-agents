import { NextResponse } from 'next/server';

import { resolveMcpAuth, getConnectedMcpServer } from '../../mcp/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await resolveMcpAuth();
    const server = await getConnectedMcpServer(auth);

    const resolveResult = await server.callTool('resolve_wallet', {});
    const resolvedWallet = (resolveResult as any)?.structuredContent || (resolveResult as any)?.wallet || resolveResult;
    const address =
      typeof resolvedWallet?.wallet_address === 'string'
        ? resolvedWallet.wallet_address
        : typeof resolvedWallet?.address === 'string'
          ? resolvedWallet.address
          : typeof resolvedWallet?.public_key === 'string'
            ? resolvedWallet.public_key
            : null;

    if (!address) {
      return NextResponse.json({
        identity: auth.identity,
        wallet: resolveResult,
        error: 'resolve_wallet did not return an address',
      }, { status: 400 });
    }

    const balancesResult = await server.callTool('solana_list_balances', { wallet_address: address, limit: 30 } as any);

    return NextResponse.json({
      identity: auth.identity,
      wallet: resolveResult,
      walletAddress: address,
      balances: balancesResult,
    });
  } catch (error: any) {
    console.error('[wallet-debug] failed', error?.message || error);
    return NextResponse.json({ error: error?.message || 'failed' }, { status: 500 });
  }
}
