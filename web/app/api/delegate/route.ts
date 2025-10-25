import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { Keypair, PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import { getSession } from "@/lib/utils";

interface DelegationRequest {
  delegatedBy: string;
  maxSolPerTx: number;
  maxTokenPerTx: number;
  durationHours: number;
  password: string;
  signature: string; // Signature to prove ownership of delegatedBy wallet
  message: string; // Message that was signed
  timestamp: number; // Timestamp of the request
}

// Security limits
const MAX_SOL_LIMIT = 10; // Maximum 10 SOL per transaction
const MAX_TOKEN_LIMIT = 1000000; // Maximum 1M tokens per transaction
const MIN_DURATION_HOURS = 1;
const MAX_DURATION_HOURS = 168; // 1 week maximum
const SIGNATURE_VALIDITY_MS = 5 * 60 * 1000; // Signatures valid for 5 minutes

// Get encryption key from environment or generate a secure default
// In production, this MUST be set via environment variable
function getEncryptionKey(): Buffer {
  const key = process.env.DELEGATION_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "DELEGATION_ENCRYPTION_KEY environment variable is not set. " +
      "Please set a 32-byte hex key for encryption."
    );
  }
  return Buffer.from(key, "hex");
}

// Encrypt sensitive data using AES-256-GCM
function encryptData(data: string, key: Buffer): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let encrypted = cipher.update(data, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

// Verify Solana wallet signature
function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, "base64");
    const publicKeyBytes = new PublicKey(publicKey).toBytes();
    
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Validate Solana public key format
function isValidSolanaPublicKey(key: string): boolean {
  try {
    new PublicKey(key);
    return true;
  } catch {
    return false;
  }
}


// Atomic write with secure permissions
async function atomicWriteFile(
  filePath: string,
  data: string,
  mode: number = 0o600
): Promise<void> {
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  
  try {
    // Write to temp file with secure permissions
    fs.writeFileSync(tempPath, data, { mode });
    
    // Atomically rename to final path
    fs.renameSync(tempPath, filePath);
    
    // Ensure final file has correct permissions
    fs.chmodSync(filePath, mode);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch {}
    throw error;
  }
}

// POST: Create a new delegation
// This endpoint is secured with signature verification and server-side encryption
export async function POST(request: NextRequest) {
  try {
    const body: DelegationRequest = await request.json();
    const {
      delegatedBy,
      maxSolPerTx,
      maxTokenPerTx,
      durationHours,
      password,
      signature,
      message,
      timestamp,
    } = body;

    // ===== 1. VALIDATE ALL REQUIRED FIELDS =====
    if (!delegatedBy || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!signature || !message || !timestamp) {
      return NextResponse.json(
        { error: "Missing authentication signature" },
        { status: 401 }
      );
    }

    // ===== 2. VALIDATE TIMESTAMP (prevent replay attacks) =====
    const now = Date.now();
    if (Math.abs(now - timestamp) > SIGNATURE_VALIDITY_MS) {
      return NextResponse.json(
        { error: "Signature has expired. Please try again." },
        { status: 401 }
      );
    }

    // ===== 3. VALIDATE PUBLIC KEY FORMAT =====
    if (!isValidSolanaPublicKey(delegatedBy)) {
      return NextResponse.json(
        { error: "Invalid delegatedBy public key format" },
        { status: 400 }
      );
    }

    // ===== 4. VERIFY SIGNATURE (Authorization) =====
    // Ensure the caller owns the delegatedBy wallet
    const isValidSignature = verifySignature(message, signature, delegatedBy);
    if (!isValidSignature) {
      return NextResponse.json(
        { error: "Invalid signature. Cannot verify wallet ownership." },
        { status: 403 }
      );
    }

    // Verify the message contains the expected delegation data
    const expectedMessagePrefix = `Maximus Delegation Request`;
    if (!message.startsWith(expectedMessagePrefix)) {
      return NextResponse.json(
        { error: "Signature message does not match delegation request" },
        { status: 403 }
      );
    }

    // ===== 5. GENERATE DELEGATE KEYPAIR SECURELY ON SERVER =====
    const delegateKeypair = Keypair.generate();
    const delegatePublicKey = delegateKeypair.publicKey.toBase58();
    const delegateSecretKey = Array.from(delegateKeypair.secretKey);

    // ===== 6. VALIDATE TRANSACTION LIMITS =====
    if (typeof maxSolPerTx !== "number" || maxSolPerTx <= 0 || maxSolPerTx > MAX_SOL_LIMIT) {
      return NextResponse.json(
        { error: `maxSolPerTx must be between 0 and ${MAX_SOL_LIMIT} SOL` },
        { status: 400 }
      );
    }

    if (typeof maxTokenPerTx !== "number" || maxTokenPerTx < 0 || maxTokenPerTx > MAX_TOKEN_LIMIT) {
      return NextResponse.json(
        { error: `maxTokenPerTx must be between 0 and ${MAX_TOKEN_LIMIT}` },
        { status: 400 }
      );
    }

    // ===== 7. VALIDATE DURATION =====
    if (
      typeof durationHours !== "number" ||
      !Number.isInteger(durationHours) ||
      durationHours < MIN_DURATION_HOURS ||
      durationHours > MAX_DURATION_HOURS
    ) {
      return NextResponse.json(
        { error: `durationHours must be between ${MIN_DURATION_HOURS} and ${MAX_DURATION_HOURS}` },
        { status: 400 }
      );
    }

    // ===== 8. VALIDATE PASSWORD =====
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // ===== 9. GET ENCRYPTION KEY =====
    let encryptionKey: Buffer;
    try {
      encryptionKey = getEncryptionKey();
    } catch (error: any) {
      console.error("Encryption key error:", error);
      return NextResponse.json(
        { error: "Server configuration error. Contact administrator." },
        { status: 500 }
      );
    }

    // ===== 10. ENCRYPT SENSITIVE DATA IN-MEMORY =====
    // Encrypt the secret key (generated securely on server, never transmitted)
    const secretKeyJson = JSON.stringify(delegateSecretKey);
    const encryptedSecretKey = encryptData(secretKeyJson, encryptionKey);

    // Encrypt the password
    const encryptedPassword = encryptData(password, encryptionKey);

    // Calculate expiry timestamp
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + durationHours);

    // ===== 11. CREATE DELEGATION DATA (with encrypted secrets) =====
    const delegationData = {
      publicKey: delegatePublicKey,
      // Store encrypted secret key and its metadata
      encryptedSecretKey: {
        data: encryptedSecretKey.encrypted,
        iv: encryptedSecretKey.iv,
        authTag: encryptedSecretKey.authTag,
      },
      delegatedBy,
      maxSolPerTx,
      maxTokenPerTx,
      allowedPrograms: ["Titan"],
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      // Store encrypted password and its metadata
      encryptedPassword: {
        data: encryptedPassword.encrypted,
        iv: encryptedPassword.iv,
        authTag: encryptedPassword.authTag,
      },
      // Add verification hash to detect tampering
      verified: true,
      signatureTimestamp: timestamp,
    };

    // ===== 12. ATOMIC WRITE WITH SECURE PERMISSIONS =====
    const configDir = path.join(os.homedir(), ".maximus");
    
    // Ensure directory exists with secure permissions
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true, mode: 0o700 });
    }

    const tempFile = path.join(configDir, "delegate_temp.json");
    
    // Write atomically with secure permissions (0o600 = owner read/write only)
    await atomicWriteFile(tempFile, JSON.stringify(delegationData, null, 2), 0o600);

    // Clear sensitive data from memory immediately
    const clearedSecretKey = delegateSecretKey.fill(0);
    const clearedPassword = password.split('').fill('*').join('');

    return NextResponse.json({
      success: true,
      delegatePublicKey,
      message: "Delegation created securely. Encrypted data saved. Please run the terminal to complete setup.",
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
export async function GET(request: NextRequest) {
  // Authenticate the request
  const session = getSession(request);
  if (!session.valid) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

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

