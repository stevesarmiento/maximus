import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

interface DelegationRequest {
  delegatePublicKey: string;
  delegateSecretKey: number[];
  delegatedBy: string;
  maxSolPerTx: number;
  maxTokenPerTx: number;
  durationHours: number;
  password: string;
}

// POST: Create a new delegation
// This saves the delegation data to a temporary file that the terminal will encrypt
export async function POST(request: NextRequest) {
  try {
    const body: DelegationRequest = await request.json();
    const {
      delegatePublicKey,
      delegateSecretKey,
      delegatedBy,
      maxSolPerTx,
      maxTokenPerTx,
      durationHours,
      password,
    } = body;

    // Validate inputs
    if (!delegatePublicKey || !delegateSecretKey || !delegatedBy || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Calculate expiry timestamp
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    // Create delegation data
    const delegationData = {
      publicKey: delegatePublicKey,
      secretKey: delegateSecretKey,
      delegatedBy,
      maxSolPerTx,
      maxTokenPerTx,
      allowedPrograms: ["Jupiter", "Raydium"],
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      password, // This will be used by Python to encrypt
    };

    // Save to temporary file that Python will read and encrypt
    const configDir = path.join(os.homedir(), ".maximus");
    
    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    const tempFile = path.join(configDir, "delegate_temp.json");
    fs.writeFileSync(tempFile, JSON.stringify(delegationData, null, 2));

    return NextResponse.json({
      success: true,
      delegatePublicKey,
      message: "Delegation data saved. Please run the terminal to complete setup.",
      tempFile,
    });
  } catch (error: any) {
    console.error("Error in POST /api/delegate:", error);
    return NextResponse.json(
      { error: "Failed to create delegation" },
      { status: 500 }
    );
  }
}

// GET: Check delegation status
export async function GET() {
  try {
    const configDir = path.join(os.homedir(), ".maximus");
    const delegateFile = path.join(configDir, "delegate_key.enc");

    // Check if delegation file exists
    const exists = fs.existsSync(delegateFile);

    return NextResponse.json({
      exists,
      message: exists
        ? "Delegation exists"
        : "No delegation found",
    });
  } catch (error) {
    console.error("Error in GET /api/delegate:", error);
    return NextResponse.json(
      { error: "Failed to check delegation status" },
      { status: 500 }
    );
  }
}

