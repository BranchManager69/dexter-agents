import { NextResponse } from "next/server";
import { MODEL_IDS } from "../../config/models";
import { getDexterApiRoute } from "../../config/env";

export async function GET() {
  try {
    const response = await fetch(getDexterApiRoute(`/realtime/sessions`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ model: MODEL_IDS.realtime }),
    });
    if (!response.ok) {
      const body = await response.text();
      console.error("/api/session upstream", {
        status: response.status,
        body,
      });
      return NextResponse.json(
        { error: "Upstream session service failure", status: response.status },
        { status: 502 }
      );
    }

    const data = await response.json();
    console.log("/api/session ok", {
      id: data?.id,
      model: data?.model,
      hasTools: Array.isArray(data?.tools) ? data.tools.length : 0,
    });
    const { tools: _ignoredTools, ...sanitized } = data ?? {};
    void _ignoredTools;
    sanitized.tools = [];
    sanitized.tool_choice = 'none';
    if (sanitized.instructions) {
      sanitized.instructions = `${sanitized.instructions}\n\n# MCP
Use the local tools provided by the client to call MCP endpoints. Do not expect server-provided tools.`;
    }
    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
