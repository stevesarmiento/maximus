import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

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

  // Ensure config directory exists
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  return configFile;
}

function readConfig(): WalletConfig {
  const configFile = getConfigPath();

  if (!fs.existsSync(configFile)) {
    return { wallets: [] };
  }

  try {
    const data = fs.readFileSync(configFile, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading config:", error);
    return { wallets: [] };
  }
}

function writeConfig(config: WalletConfig): void {
  const configFile = getConfigPath();
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2), "utf-8");
}

// GET: List all wallets
export async function GET() {
  try {
    const config = readConfig();
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
  try {
    const body = await request.json();
    const { address, label } = body;

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const config = readConfig();

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
    writeConfig(config);

    return NextResponse.json({ wallet: newWallet }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/wallets:", error);
    return NextResponse.json(
      { error: "Failed to add wallet" },
      { status: 500 }
    );
  }
}

// DELETE: Remove a wallet
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const config = readConfig();
    const initialLength = config.wallets.length;

    config.wallets = config.wallets.filter((w) => w.address !== address);

    if (config.wallets.length === initialLength) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    writeConfig(config);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/wallets:", error);
    return NextResponse.json(
      { error: "Failed to remove wallet" },
      { status: 500 }
    );
  }
}

