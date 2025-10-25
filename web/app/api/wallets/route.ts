import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import { lock } from "proper-lockfile";
import crypto from "crypto";

interface Wallet {
  address: string;
  label: string | null;
  added_at: string;
  user_id: string;
}

interface WalletConfig {
  wallets: Wallet[];
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limiting store (consider Redis for production)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per user

/**
 * Authenticates the request and returns the user ID
 * Uses API key from X-API-Key header or Authorization Bearer token
 * In production, replace with proper session/OAuth implementation
 */
function authenticateRequest(request: NextRequest): string | null {
  // Check for API key in X-API-Key header
  const apiKey = request.headers.get("X-API-Key");
  
  // Check for Bearer token in Authorization header
  const authHeader = request.headers.get("Authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") 
    ? authHeader.substring(7) 
    : null;

  const token = apiKey || bearerToken;

  if (!token) {
    return null;
  }

  // Validate token format (basic validation)
  if (token.length < 32) {
    return null;
  }

  // Generate a consistent user ID from the token
  // In production, validate against a database/session store
  const userId = crypto.createHash("sha256").update(token).digest("hex");
  
  return userId;
}

/**
 * Rate limiting check
 * Returns true if request is within limits, false if rate limited
 */
function checkRateLimit(userId: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const userKey = `ratelimit:${userId}`;
  
  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance to clean up on each request
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  }

  const entry = rateLimitStore.get(userKey);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    rateLimitStore.set(userKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(userKey, entry);
  
  return { allowed: true };
}

/**
 * Validates input for POST/DELETE requests
 */
function validateWalletInput(body: unknown): { 
  valid: boolean; 
  error?: string; 
  data?: { address: string; label?: string | null } 
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const { address, label } = body as Record<string, unknown>;

  if (!address || typeof address !== "string") {
    return { valid: false, error: "Wallet address is required and must be a string" };
  }

  // Check for reasonable length
  if (address.length < 32 || address.length > 44) {
    return { valid: false, error: "Invalid wallet address length" };
  }

  // Check for valid base58 characters (Solana addresses)
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
    return { valid: false, error: "Invalid wallet address format (must be base58)" };
  }

  // Validate label if provided
  if (label !== undefined && label !== null) {
    if (typeof label !== "string") {
      return { valid: false, error: "Label must be a string" };
    }
    if (label.length > 100) {
      return { valid: false, error: "Label is too long (max 100 characters)" };
    }
  }

  return { 
    valid: true, 
    data: { 
      address: address.trim(), 
      label: label ? (label as string).trim() : null 
    } 
  };
}

function getConfigPath(): string {
  const configDir = path.join(os.homedir(), ".maximus");
  const configFile = path.join(configDir, "wallets.json");
  return configFile;
}

async function ensureConfigDir(): Promise<void> {
  const configDir = path.join(os.homedir(), ".maximus");
  try {
    await fs.access(configDir);
  } catch {
    await fs.mkdir(configDir, { recursive: true });
  }
}

async function ensureConfigFileExists(): Promise<void> {
  const configFile = getConfigPath();
  // Create empty config file if it doesn't exist (required for proper-lockfile)
  try {
    await fs.access(configFile);
  } catch {
    await ensureConfigDir();
    await fs.writeFile(configFile, JSON.stringify({ wallets: [] }, null, 2), "utf-8");
  }
}

async function readConfig(): Promise<WalletConfig> {
  const configFile = getConfigPath();

  try {
    await ensureConfigDir();
    const data = await fs.readFile(configFile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // Handle missing file, read error, or JSON parse error
    console.error("Error reading config:", error);
    return { wallets: [] };
  }
}

async function writeConfig(config: WalletConfig): Promise<void> {
  const configFile = getConfigPath();
  
  try {
    await ensureConfigDir();
    await fs.writeFile(configFile, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing config:", error);
    throw error; // Rethrow so callers can handle write failures
  }
}

// GET: List all wallets (with auth and rate limiting)
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const userId = authenticateRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Provide a valid API key via X-API-Key header or Authorization Bearer token." },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter || 60),
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
            "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + (rateLimitResult.retryAfter || 60)),
          }
        }
      );
    }

    // Read config and filter wallets by user ID
    const config = await readConfig();
    const userWallets = config.wallets.filter((w) => w.user_id === userId);
    
    return NextResponse.json({ 
      wallets: userWallets,
      count: userWallets.length 
    });
  } catch (error) {
    console.error("Error in GET /api/wallets:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallets" },
      { status: 500 }
    );
  }
}

// POST: Add a new wallet (with auth, rate limiting, and validation)
export async function POST(request: NextRequest) {
  let release: (() => Promise<void>) | null = null;

  try {
    // Authenticate request
    const userId = authenticateRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Provide a valid API key via X-API-Key header or Authorization Bearer token." },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter || 60),
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
            "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + (rateLimitResult.retryAfter || 60)),
          }
        }
      );
    }

    // Parse and validate input
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const validation = validateWalletInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { address, label } = validation.data!;

    // Validate Solana address format with PublicKey
    try {
      new PublicKey(address);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid Solana wallet address format" },
        { status: 400 }
      );
    }

    // Ensure config file exists before attempting to lock
    await ensureConfigFileExists();
    const configFile = getConfigPath();

    // Acquire exclusive lock on config file
    release = await lock(configFile, {
      retries: {
        retries: 10,
        minTimeout: 50,
        maxTimeout: 500,
      },
    });

    // Re-read config while holding the lock
    const config = await readConfig();

    // Check if wallet already exists for this user
    if (config.wallets.some((w) => w.address === address && w.user_id === userId)) {
      return NextResponse.json(
        { error: "Wallet already exists in your collection" },
        { status: 409 }
      );
    }

    // Check user's wallet limit (prevent abuse)
    const userWalletCount = config.wallets.filter((w) => w.user_id === userId).length;
    const MAX_WALLETS_PER_USER = 100;
    if (userWalletCount >= MAX_WALLETS_PER_USER) {
      return NextResponse.json(
        { error: `Maximum wallet limit reached (${MAX_WALLETS_PER_USER} wallets per user)` },
        { status: 429 }
      );
    }

    // Add new wallet with user_id
    const newWallet: Wallet = {
      address,
      label: label || null,
      added_at: new Date().toISOString(),
      user_id: userId,
    };

    config.wallets.push(newWallet);
    await writeConfig(config);

    return NextResponse.json({ wallet: newWallet }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/wallets:", error);
    return NextResponse.json(
      { error: "Failed to add wallet" },
      { status: 500 }
    );
  } finally {
    // Always release the lock
    if (release) {
      try {
        await release();
      } catch (error) {
        console.error("Error releasing lock:", error);
      }
    }
  }
}

// DELETE: Remove a wallet
export async function DELETE(request: NextRequest) {
  let release: (() => Promise<void>) | null = null;

  try {
    // Authenticate request
    const userId = authenticateRequest(request);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Provide a valid API key via X-API-Key header or Authorization Bearer token." },
        { status: 401 }
      );
    }

    // Check rate limit
    const rateLimitResult = checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter || 60),
            "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
            "X-RateLimit-Reset": String(Math.floor(Date.now() / 1000) + (rateLimitResult.retryAfter || 60)),
          }
        }
      );
    }

    // Parse and validate input
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const validation = validateWalletInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { address } = validation.data!;

    // Ensure config file exists before attempting to lock
    await ensureConfigFileExists();
    const configFile = getConfigPath();

    // Acquire exclusive lock on config file
    release = await lock(configFile, {
      retries: {
        retries: 10,
        minTimeout: 50,
        maxTimeout: 500,
      },
    });

    // Re-read config while holding the lock
    const config = await readConfig();
    const initialLength = config.wallets.length;

    // Only allow user to delete their own wallets
    config.wallets = config.wallets.filter((w) => !(w.address === address && w.user_id === userId));

    if (config.wallets.length === initialLength) {
      return NextResponse.json(
        { error: "Wallet not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    await writeConfig(config);

    return NextResponse.json({ 
      success: true,
      message: "Wallet removed successfully" 
    });
  } catch (error) {
    console.error("Error in DELETE /api/wallets:", error);
    return NextResponse.json(
      { error: "Failed to remove wallet" },
      { status: 500 }
    );
  } finally {
    // Always release the lock
    if (release) {
      try {
        await release();
      } catch (error) {
        console.error("Error releasing lock:", error);
      }
    }
  }
}

