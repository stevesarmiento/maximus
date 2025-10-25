import { NextRequest, NextResponse } from "next/server";

// Simple endpoint to fetch token balances for the token approval UI
// Uses the client-side connection, so this just returns a success response
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wallet = searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet parameter required" },
      { status: 400 }
    );
  }

  // The actual token fetching happens client-side via @solana/web3.js
  // This endpoint can be expanded to use the Python backend if needed
  return NextResponse.json({
    tokens: [],
    message: "Use client-side token fetching",
  });
}

