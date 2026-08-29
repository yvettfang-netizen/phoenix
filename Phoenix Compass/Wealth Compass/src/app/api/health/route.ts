import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ service: "wealth-compass", status: "ok", rulesStatus: "RULES_NOT_LOADED", version: "0.1.0" });
}
