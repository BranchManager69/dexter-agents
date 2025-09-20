import { NextRequest, NextResponse } from 'next/server';
import { MCPServerStreamableHttp } from '@openai/agents-core';

const MCP_URL = (process.env.MCP_URL || process.env.NEXT_PUBLIC_MCP_URL || 'https://mcp.dexter.cash/mcp').replace(/\/$/, '');
const MCP_TOKEN = process.env.TOKEN_AI_MCP_TOKEN || process.env.NEXT_PUBLIC_TOKEN_AI_MCP_TOKEN || '';

const globalAny = globalThis as typeof globalThis & {
  __dexterMcpClient?: {
    server: MCPServerStreamableHttp;
    connected: boolean;
    connecting: Promise<void> | null;
  };
};

function getClient() {
  if (!globalAny.__dexterMcpClient) {
    const headers = MCP_TOKEN ? { Authorization: `Bearer ${MCP_TOKEN}` } : undefined;
    const server = new MCPServerStreamableHttp({
      url: MCP_URL,
      requestInit: headers ? { headers } : undefined,
      cacheToolsList: true,
    });
    globalAny.__dexterMcpClient = { server, connected: false, connecting: null };
  }
  return globalAny.__dexterMcpClient!;
}

async function ensureConnected() {
  const client = getClient();
  if (client.connected) return client.server;
  if (!client.connecting) {
    client.connecting = client.server.connect().then(() => {
      client.connected = true;
      client.connecting = null;
    }).catch((error) => {
      client.connecting = null;
      throw error;
    });
  }
  await client.connecting;
  return client.server;
}

export async function GET() {
  try {
    const server = await ensureConnected();
    const tools = await server.listTools();
    return NextResponse.json({ tools });
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

    const server = await ensureConnected();
    const result = await server.callTool(tool, args);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[mcp] call failed', error?.message || error);
    return NextResponse.json({ error: 'mcp_call_failed', message: error?.message || String(error) }, { status: 500 });
  }
}
