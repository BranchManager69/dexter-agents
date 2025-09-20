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
    const data = await response.json();
    console.log('raw_session_payload', JSON.stringify(data));
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
