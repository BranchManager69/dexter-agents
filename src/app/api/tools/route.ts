import { NextResponse } from "next/server";
import { CONFIG, getDexterApiRoute } from "../../../app/config/env";

export async function GET(request: Request) {
  try {
    const url = new URL(getDexterApiRoute("/tools"));
    const fetchOptions: RequestInit = {
      method: "GET",
      headers: {},
      credentials: "include",
    };

    if (CONFIG.mcpToken) {
      (fetchOptions.headers as Record<string, string>).Authorization = `Bearer ${CONFIG.mcpToken}`;
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get("content-type") || "application/json";
    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "content-type": contentType,
      },
    });
  } catch (error) {
    console.error("Error in /api/tools:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
