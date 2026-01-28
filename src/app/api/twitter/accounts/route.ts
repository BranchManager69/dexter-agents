import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getDexterApiRoute } from "@/app/config/env";
import { createScopedLogger } from "@/server/logger";

type Database = any;
const log = createScopedLogger({ scope: "api.twitter.accounts" });

export async function GET() {
  const requestId = randomUUID();
  const startedAt = Date.now();
  const routeLog = log.child({
    requestId,
    path: "/api/twitter/accounts",
    method: "GET",
  });

  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient<Database>(
      { cookies: () => cookieStore },
      {
        supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    );

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;
    if (!accessToken) {
      routeLog.debug(
        {
          event: "no_access_token",
          durationMs: Date.now() - startedAt,
        },
        "Twitter accounts request skipped: no Supabase access token",
      );
      return NextResponse.json({ ok: false, accounts: [] }, { status: 200 });
    }

    const response = await fetch(getDexterApiRoute("/auth/twitter/accounts"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      routeLog.warn(
        {
          event: "twitter_accounts_upstream_failure",
          durationMs: Date.now() - startedAt,
          upstreamStatus: response.status,
          bodyPreview: body.slice(0, 256),
        },
        "Twitter accounts upstream request failed",
      );
      // Return empty accounts rather than error - user just doesn't have linked accounts
      return NextResponse.json({ ok: true, accounts: [] });
    }

    const data = await response.json();
    routeLog.debug(
      {
        event: "twitter_accounts_success",
        durationMs: Date.now() - startedAt,
        accountCount: Array.isArray(data?.accounts) ? data.accounts.length : 0,
      },
      "Fetched twitter accounts successfully",
    );
    return NextResponse.json(data);
  } catch (error) {
    routeLog.error(
      {
        event: "handler_exception",
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error),
      },
      "Unhandled error in twitter accounts endpoint",
    );
    return NextResponse.json({ ok: false, accounts: [] }, { status: 200 });
  }
}
