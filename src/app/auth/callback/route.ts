import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type Database = any;

export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const projectRefMatch = SUPABASE_URL?.match(/^https?:\/\/([a-z0-9-]+)\./i);
const SUPABASE_PROJECT_REF = projectRefMatch ? projectRefMatch[1] : null;

const AUTH_COOKIE_NAMES = SUPABASE_PROJECT_REF
  ? [
      `sb-${SUPABASE_PROJECT_REF}-auth-token`,
      `sb-${SUPABASE_PROJECT_REF}-auth-token.refresh`,
    ]
  : [];

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function deriveCookieDomain(rawHost: string | null): string | undefined {
  if (process.env.SUPABASE_COOKIE_DOMAIN && process.env.SUPABASE_COOKIE_DOMAIN.trim()) {
    return process.env.SUPABASE_COOKIE_DOMAIN.trim();
  }

  const host = (rawHost ?? "").toLowerCase().split(":")[0];
  if (!host) return undefined;

  if (host === "dexter.cash" || host === "www.dexter.cash" || host.endsWith(".dexter.cash")) {
    return ".dexter.cash";
  }

  return undefined;
}

function createCookieOptions(cookieDomain?: string) {
  const options: Record<string, any> = {
    path: "/",
    sameSite: "lax",
    secure: true,
  };
  if (cookieDomain) {
    options.domain = cookieDomain;
  }
  return options;
}

function resealCookies(store: CookieStore, cookieDomain?: string) {
  if (!AUTH_COOKIE_NAMES.length) return;
  for (const name of AUTH_COOKIE_NAMES) {
    const existing = (store as any).get(name);
    if (!existing) continue;
    (store as any).set(name, existing.value, {
      ...createCookieOptions(cookieDomain),
      httpOnly: true,
    });
  }
}

export async function POST(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("/auth/callback missing Supabase configuration");
    return NextResponse.json({ ok: false, error: "supabase_config_missing" }, { status: 500 });
  }
  try {
    const payload = await request.json();
    const { event, session } = payload ?? {};
    const cookieDomain = deriveCookieDomain(request.headers.get("host"));
    const cookieStorePromise = cookies();
    const supabase = createRouteHandlerClient<Database>(
      { cookies: () => cookieStorePromise },
      {
        supabaseUrl: SUPABASE_URL,
        supabaseKey: SUPABASE_ANON_KEY,
        cookieOptions: createCookieOptions(cookieDomain) as any,
      },
    );

    if (event === "SIGNED_OUT" || !session) {
      await supabase.auth.signOut();
    } else {
      await supabase.auth.setSession(session);
      const cookieStore = await cookieStorePromise;
      resealCookies(cookieStore, cookieDomain);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("/auth/callback error", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("/auth/callback DELETE missing Supabase configuration");
    return NextResponse.json({ ok: false, error: "supabase_config_missing" }, { status: 500 });
  }
  const host = request.headers.get("host");
  const cookieDomain = deriveCookieDomain(host);
  const cookieStorePromise = cookies();
  const supabase = createRouteHandlerClient<Database>(
    { cookies: () => cookieStorePromise },
    {
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_ANON_KEY,
      cookieOptions: createCookieOptions(cookieDomain) as any,
    },
  );
  await supabase.auth.signOut();
  const cookieStore = await cookieStorePromise;
  resealCookies(cookieStore, cookieDomain);
  return NextResponse.json({ ok: true });
}
