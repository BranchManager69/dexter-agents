import { NextResponse } from 'next/server';

import { resolveMcpAuth, summarizeIdentity } from '../auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await resolveMcpAuth();
    const summary = summarizeIdentity(auth);
    return NextResponse.json({
      state: summary.state,
      label: summary.label,
      detail: summary.detail,
      minted: auth.minted,
    });
  } catch (error: any) {
    console.error('[mcp] status failed', error?.message || error);
    return NextResponse.json({ state: 'error', label: 'Unavailable' }, { status: 500 });
  }
}
