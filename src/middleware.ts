import { NextResponse } from "next/server";

// Pass-through. Host-to-store resolution is added in a later issue.
// This middleware is never a security barrier.
export function middleware() {
  return NextResponse.next();
}
