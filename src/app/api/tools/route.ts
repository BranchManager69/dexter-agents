import { NextResponse } from "next/server";
import { getConnectedMcpServer, resolveMcpAuth, summarizeIdentity } from "../../api/mcp/auth";

export async function GET() {
  try {
    const auth = await resolveMcpAuth();
    const server = await getConnectedMcpServer(auth);
    const result = await server.listTools();

    const summary = summarizeIdentity(auth);
    const response = NextResponse.json({ tools: Array.isArray((result as any)?.tools) ? (result as any).tools : result });
    response.headers.set('x-dexter-mcp-state', summary.state);
    if (summary.detail) response.headers.set('x-dexter-mcp-detail', summary.detail);
    return response;
  } catch (error) {
    console.error("Error in /api/tools:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
