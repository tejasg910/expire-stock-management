import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest } from "next/server";

const handler = toNextJsHandler(auth);

export async function GET(req: NextRequest) {
  return handler.GET(req);
}

export async function POST(req: NextRequest) {
  console.log("[auth] POST", req.nextUrl.pathname);
  try {
    const res = await handler.POST(req);
    const body = await res.clone().text();
    console.log("[auth] response", res.status, body);
    return res;
  } catch (e) {
    console.error("[auth] CAUGHT ERROR", e);
    throw e;
  }
}
