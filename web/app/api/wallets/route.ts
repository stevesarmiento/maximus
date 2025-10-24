import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";
import { lock } from "proper-lockfile";

interface Wallet {
  address: string;
  label: string | null;
  added_at: string;
}

interface WalletConfig {
  wallets: Wallet[];
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

// TODO: Add authentication and authorization
// All three endpoints (GET, POST, DELETE) currently lack authentication and authorization.
// This means anyone who can reach these endpoints can view, add, or remove wallet addresses.
// Consider implementing:
// - Next-Auth for OAuth/session management
// - API key validation if this is a service API
// - Middleware-based authentication for all routes under /api/wallets
// - Rate limiting to prevent abuse
// Example implementation:
//   const session = await auth(request);
//   if (!session) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

// GET: List all wallets
export async function GET() {
  try {
    const config = await readConfig();
    return NextResponse.json({ wallets: config.wallets });
  } catch (error) {
    console.error("Error in GET /api/wallets:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallets" },
      { status: 500 }
    );
  }
}

// POST: Add a new wallet
export async function POST(request: NextRequest) {
  let release: (() => Promise<void>) | null = null;

  try {
    const body = await request.json();
    const { address, label } = body;

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Validate Solana address format
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

    // Check if wallet already exists
    if (config.wallets.some((w) => w.address === address)) {
      return NextResponse.json(
        { error: "Wallet already exists" },
        { status: 409 }
      );
    }

    // Add new wallet
    const newWallet: Wallet = {
      address,
      label: label || null,
      added_at: new Date().toISOString(),
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
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
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
    const initialLength = config.wallets.length;

    config.wallets = config.wallets.filter((w) => w.address !== address);

    if (config.wallets.length === initialLength) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    await writeConfig(config);

    return NextResponse.json({ success: true });
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

