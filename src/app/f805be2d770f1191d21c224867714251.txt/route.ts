import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("a861b30a106fc4b1abaa8205f8afb124187e46b2", {
    headers: { "Content-Type": "text/plain" },
  });
}
