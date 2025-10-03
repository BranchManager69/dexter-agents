import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getDexterApiRoute } from "@/app/config/env";

type Database = any;

export async function GET() {
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
      return NextResponse.json({ ok: false, error: "authentication_required" }, { status: 401 });
    }

    const response = await fetch(getDexterApiRoute("/wallets/export"), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const rawBody = await response.text();

    if (!response.ok) {
      const status = response.status === 401 ? 401 : 502;
      return NextResponse.json(
        {
          ok: false,
          error: "wallet_export_failed",
          status: response.status,
          body: rawBody.slice(0, 512),
        },
        { status }
      );
    }

    try {
      const data = rawBody ? JSON.parse(rawBody) : {};
      return NextResponse.json(data, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return NextResponse.json({ ok: false, error: "wallet_export_parse_error" }, { status: 502 });
    }
  } catch (error) {
    console.error("Error in /api/wallet/export", error);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
