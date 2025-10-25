# Encryption Setup Guide

## Quick Start

The Maximus delegation endpoint requires a 32-byte encryption key to secure sensitive data. Follow these steps to set it up:

### 1. Generate an Encryption Key

Run **ONE** of the following commands to generate a secure random key:

**Option A: Using Node.js (Recommended)**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option B: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Option C: Using Python**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

This will output a 64-character hexadecimal string like:
```
a3f7b9c2d4e6f8a1b3c5d7e9f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8
```

### 2. Set the Environment Variable

**For Local Development:**

Create a `.env.local` file in the `web/` directory and add:
```bash
DELEGATION_ENCRYPTION_KEY=<paste-your-64-char-key-here>
```

**Quick setup script:**
```bash
cd web
echo "DELEGATION_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" > .env.local
echo "✅ Encryption key generated and saved to .env.local"
```

**For Production (Vercel):**
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add a new variable:
   - Name: `DELEGATION_ENCRYPTION_KEY`
   - Value: Your 64-character hex key
   - Environments: Production, Preview, Development (as needed)
4. Redeploy your application

### 3. Verify Setup

Start your development server:
```bash
npm run dev
```

Try creating a delegation. If the environment variable is not set, you'll see:
```
Server configuration error. Contact administrator.
```

If set correctly, delegations will be created and encrypted successfully.

## Security Warnings

⚠️ **NEVER commit `.env.local` or `.env` files to version control!**

The `.gitignore` file should already include:
```gitignore
.env.local
.env*.local
.env
```

⚠️ **Store your production key securely:**
- Use your hosting platform's secret management (e.g., Vercel Environment Variables)
- For self-hosted: Use AWS Secrets Manager, HashiCorp Vault, or similar
- Never share the key via insecure channels (email, Slack, etc.)

⚠️ **Key Rotation:**
If your encryption key is compromised:
1. Generate a new key
2. Update the environment variable
3. Restart your application
4. All existing delegations will need to be recreated (old encrypted data cannot be decrypted with new key)

## Troubleshooting

### Error: "DELEGATION_ENCRYPTION_KEY environment variable is not set"

**Solution:** Make sure you've created the `.env.local` file with the encryption key.

```bash
cd web
cat .env.local  # Should show: DELEGATION_ENCRYPTION_KEY=...
```

If the file doesn't exist, follow step 2 above.

### Error: "Invalid argument" or "Crypto error"

**Solution:** Your key might be invalid. It must be exactly 64 hexadecimal characters (0-9, a-f).

Generate a new key using the commands in step 1.

### Delegations not working after key change

**Expected behavior:** If you change the encryption key, existing encrypted delegations cannot be decrypted.

**Solution:** Users must create new delegations with the new key.

## What Gets Encrypted?

The following sensitive data is encrypted using this key:
- **Delegate wallet secret key** (64-byte Solana keypair)
- **Password** (used by Python CLI for additional encryption layer)

This provides server-side encryption at rest. Even if someone gains filesystem access, they cannot read the secrets without the encryption key.

## Additional Security

This encryption key is just one layer of security. The system also includes:
- ✅ Wallet signature verification (proves ownership)
- ✅ Timestamp validation (prevents replay attacks)
- ✅ Input validation (prevents injection)
- ✅ Secure file permissions (0o600 = owner-only access)
- ✅ Atomic file writes (prevents race conditions)

See [SECURITY.md](./SECURITY.md) for complete security documentation.

## Development vs Production

**Development (.env.local):**
- Stored in local file
- Only accessible to your development environment
- Can be regenerated anytime during development

**Production (Environment Variables):**
- Stored in secure secret management system
- Should be rotated periodically (e.g., every 90 days)
- Should be backed up securely
- Should be different from development key

---

**Need Help?** See [SECURITY.md](./SECURITY.md) for detailed security information.

