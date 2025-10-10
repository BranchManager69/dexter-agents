import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log("[transcription-debug]", JSON.stringify(payload));
    return NextResponse.json({ logged: true });
  } catch (error) {
    console.error("[transcription-debug] invalid payload", error);
    return NextResponse.json({ logged: false, error: "invalid_payload" }, { status: 400 });
  }
}
