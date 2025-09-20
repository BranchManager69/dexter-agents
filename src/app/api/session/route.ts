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
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
