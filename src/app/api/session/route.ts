import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { MODEL_IDS } from "../../config/models";
import { getDexterApiRoute } from "../../config/env";

type Database = any;

const ALLOW_GUEST_SESSIONS =
  process.env.NEXT_PUBLIC_ALLOW_GUEST_SESSIONS === "false" ? false : true;

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStorePromise = cookies();
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStorePromise });
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.warn("/api/session supabase session error", sessionError.message);
    }

    const isAuthenticated = Boolean(session?.user);

    const authHeader = request.headers.get("authorization") || "";
    const bearerToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!isAuthenticated && !ALLOW_GUEST_SESSIONS) {
      return NextResponse.json({ error: "Sign-in required" }, { status: 401 });
    }

    const payload: Record<string, any> = { model: MODEL_IDS.realtime };

    if (isAuthenticated && session?.access_token) {
      payload.supabaseAccessToken = session.access_token;
    } else if (bearerToken) {
      payload.supabaseAccessToken = bearerToken;
    } else {
      payload.guestProfile = {
        label: "Dexter Demo Wallet",
        instructions:
          "Operate only in read-only or low-risk flows and encourage the user to sign in for persistent, personalized sessions.",
      };
    }

    const response = await fetch(getDexterApiRoute(`/realtime/sessions`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
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
    const sessionType = data?.dexter_session?.type || (isAuthenticated ? "user" : "guest");
    console.log("/api/session ok", {
      id: data?.id,
      model: data?.model,
      hasTools: Array.isArray(data?.tools) ? data.tools.length : 0,
      sessionType,
      supabaseUserId: data?.dexter_session?.user?.id ?? null,
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
