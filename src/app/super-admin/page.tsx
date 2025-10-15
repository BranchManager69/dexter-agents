import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { createSupabaseRouteClient } from "../auth/supabaseServer";

function normalizeRoles(rawRoles: unknown): string[] {
  if (!rawRoles) return [];
  if (Array.isArray(rawRoles)) {
    return rawRoles
      .map((role) => (typeof role === "string" ? role.toLowerCase() : String(role || "").toLowerCase()))
      .filter(Boolean);
  }
  if (typeof rawRoles === "string") {
    return [rawRoles.toLowerCase()];
  }
  return [];
}

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const cookieStore = cookies();
  const supabase = createSupabaseRouteClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    redirect("/"); // Force regular auth flow before granting access
  }

  const roles = normalizeRoles((session.user as any)?.app_metadata?.roles);
  const isSuperAdmin =
    roles.includes("superadmin") ||
    Boolean((session.user as any)?.user_metadata?.isSuperAdmin) ||
    Boolean((session.user as any)?.isSuperAdmin);

  if (!isSuperAdmin) {
    notFound();
  }

  const email = session.user.email ?? "Super Admin";

  return (
    <div className="min-h-screen bg-surface-base/90 text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="rounded-2xl border border-border-subtle/60 bg-surface-raised/80 p-8 shadow-[0_35px_120px_rgba(0,0,0,0.35)] backdrop-blur-md">
          <div className="text-xs uppercase tracking-widest text-neutral-400">Super Admin</div>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-foreground">Dexter Control Room</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-300">
            Welcome back{email ? `, ${email}` : ""}. This space is reserved for super admins.
            Drop quick diagnostics, launch checklists, or any private tooling here as the platform evolves.
          </p>
          <div className="mt-10 rounded-lg border border-border-subtle/70 bg-surface-base/80 p-6 text-sm text-neutral-300">
            <div className="text-xs uppercase tracking-widest text-neutral-500">Status</div>
            <p className="mt-2 text-base text-foreground">No widgets wired up yet — you&apos;re clear to launch.</p>
            <p className="mt-4 text-sm text-neutral-400">
              Add cards, metrics, or admin-only actions in this container when you&apos;re ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
