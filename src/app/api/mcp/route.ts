import { NextRequest, NextResponse } from 'next/server';

import { getConnectedMcpServer, resolveMcpAuth, summarizeIdentity } from './auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const auth = await resolveMcpAuth();
    const server = await getConnectedMcpServer(auth);
    const tools = await server.listTools();

    const summary = summarizeIdentity(auth);
    const response = NextResponse.json({
      tools,
      identity: summary,
    });
    response.headers.set('x-dexter-mcp-state', summary.state);
    if (summary.detail) {
      response.headers.set('x-dexter-mcp-detail', summary.detail);
    }
    return response;
  } catch (error: any) {
    console.error('[mcp] list tools failed', error?.message || error);
    return NextResponse.json({ error: 'mcp_list_failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const tool = String(body.tool || body.name || '').trim();
    const args = (body.arguments || body.args || {}) as Record<string, unknown>;

    if (!tool) {
      return NextResponse.json({ error: 'missing_tool' }, { status: 400 });
    }

    const auth = await resolveMcpAuth();
    const server = await getConnectedMcpServer(auth);
    const result = await server.callTool(tool, args);

    const summary = summarizeIdentity(auth);
    const response = NextResponse.json(result);
    response.headers.set('x-dexter-mcp-state', summary.state);
    if (summary.detail) {
      response.headers.set('x-dexter-mcp-detail', summary.detail);
    }
    return response;
  } catch (error: any) {
    console.error('[mcp] call failed', error?.message || error);
    return NextResponse.json({ error: 'mcp_call_failed', message: error?.message || String(error) }, { status: 500 });
  }
}
