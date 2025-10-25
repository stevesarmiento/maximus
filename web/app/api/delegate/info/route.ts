import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

// GET: Get delegate public key from encrypted file
// This is a simplified version - in production, you'd decrypt to get the public key
export async function GET() {
  try {
    const configDir = path.join(os.homedir(), ".maximus");
    const tempFile = path.join(configDir, "delegate_temp.json");

    // Check temp file first (not yet processed by terminal)
    if (fs.existsSync(tempFile)) {
      const data = JSON.parse(fs.readFileSync(tempFile, "utf-8"));
      return NextResponse.json({
        publicKey: data.publicKey,
        status: "pending",
      });
    }

    // If no temp file, would need to decrypt the encrypted file
    // For now, return not found
    return NextResponse.json(
      {
        error: "Delegate info not available. Start terminal to activate delegation.",
      },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error in GET /api/delegate/info:", error);
    return NextResponse.json(
      { error: "Failed to get delegate info" },
      { status: 500 }
    );
  }
}

