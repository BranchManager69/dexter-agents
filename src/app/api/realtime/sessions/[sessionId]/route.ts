import { NextResponse } from "next/server";
import { getDexterApiRoute } from "../../../../config/env";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: { sessionId: string } }) {
  try {
    const { sessionId } = params;
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session id" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 });
    }

    const upstream = await fetch(getDexterApiRoute(`/realtime/sessions/${encodeURIComponent(sessionId)}`), {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
      credentials: "include",
    });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      console.warn("/api/realtime/sessions delete upstream", {
        status: upstream.status,
        body: body.slice(0, 200),
      });
      return NextResponse.json({ error: "Upstream realtime session delete failed" }, { status: upstream.status });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Error in DELETE /api/realtime/sessions/:id", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
