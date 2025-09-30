import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

type Database = any;

export const dynamic = 'force-dynamic';

const COOKIE_DOMAIN = process.env.SUPABASE_COOKIE_DOMAIN || ".dexter.cash";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const projectRefMatch = SUPABASE_URL?.match(/^https?:\/\/([a-z0-9-]+)\./i);
const SUPABASE_PROJECT_REF = projectRefMatch ? projectRefMatch[1] : null;

const AUTH_COOKIE_NAMES = SUPABASE_PROJECT_REF
  ? [
      `sb-${SUPABASE_PROJECT_REF}-auth-token`,
      `sb-${SUPABASE_PROJECT_REF}-auth-token.refresh`,
    ]
  : [];

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function resealCookies(store: CookieStore) {
  if (!AUTH_COOKIE_NAMES.length) return;
  for (const name of AUTH_COOKIE_NAMES) {
    const existing = (store as any).get(name);
    if (!existing) continue;
    (store as any).set(name, existing.value, {
      domain: COOKIE_DOMAIN,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
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
    const cookieStorePromise = cookies();
    const supabase = createRouteHandlerClient<Database>(
      { cookies: () => cookieStorePromise },
      {
        supabaseUrl: SUPABASE_URL,
        supabaseKey: SUPABASE_ANON_KEY,
        cookieOptions: {
          domain: COOKIE_DOMAIN,
          path: "/",
          sameSite: "lax",
          secure: true,
        },
      },
    );

    if (event === "SIGNED_OUT" || !session) {
      await supabase.auth.signOut();
    } else {
      await supabase.auth.setSession(session);
      const cookieStore = await cookieStorePromise;
      resealCookies(cookieStore);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("/auth/callback error", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

export async function DELETE() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("/auth/callback DELETE missing Supabase configuration");
    return NextResponse.json({ ok: false, error: "supabase_config_missing" }, { status: 500 });
  }
  const cookieStorePromise = cookies();
  const supabase = createRouteHandlerClient<Database>(
    { cookies: () => cookieStorePromise },
    {
      supabaseUrl: SUPABASE_URL,
      supabaseKey: SUPABASE_ANON_KEY,
      cookieOptions: {
        domain: COOKIE_DOMAIN,
        path: "/",
        sameSite: "lax",
        secure: true,
      },
    },
  );
  await supabase.auth.signOut();
  const cookieStore = await cookieStorePromise;
  resealCookies(cookieStore);
  return NextResponse.json({ ok: true });
}
