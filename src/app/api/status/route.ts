import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reports only whether a Gemini key is configured — never the key itself. */
export async function GET() {
  return NextResponse.json({ configured: Boolean(process.env.GEMINI_API_KEY) });
}
