# Security Documentation for Maximus Web

## Overview

The Maximus web application implements comprehensive security measures to protect sensitive wallet delegation data. This document outlines the security architecture, setup requirements, and best practices.

## Security Features

### 1. Authentication & Authorization

**Wallet Signature Verification**
- Every delegation request must be signed by the wallet owner
- Signatures include timestamps to prevent replay attacks (5-minute validity window)
- Server verifies that the signature matches the `delegatedBy` wallet address
- Message includes all delegation parameters to prevent parameter tampering

**Implementation:**
- Frontend: Uses Solana Wallet Adapter's `signMessage` API
- Backend: Verifies signatures using `tweetnacl` and `@solana/web3.js`

### 2. Server-Side Encryption

**AES-256-GCM Encryption**
All sensitive data (secret keys and passwords) are encrypted **before** being written to disk:

- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key Management:** 32-byte encryption key from environment variable
- **Never Stored Plaintext:** Secret keys and passwords are encrypted in-memory immediately
- **Authenticated Encryption:** GCM mode provides integrity verification (prevents tampering)

**What Gets Encrypted:**
- Delegate wallet secret key (64-byte Solana keypair)
- Encryption password (used by Python CLI for additional layer)

**Encrypted Storage Format:**
```json
{
  "encryptedSecretKey": {
    "data": "hex-encoded-ciphertext",
    "iv": "initialization-vector",
    "authTag": "authentication-tag"
  },
  "encryptedPassword": {
    "data": "hex-encoded-ciphertext",
    "iv": "initialization-vector",
    "authTag": "authentication-tag"
  }
}
```

### 3. Input Validation

**Comprehensive validation on all inputs:**

- **Public Keys:** Validated using Solana's `PublicKey` constructor
- **Secret Keys:** Must be exactly 64 bytes, each 0-255
- **Transaction Limits:**
  - `maxSolPerTx`: 0 < value ≤ 10 SOL
  - `maxTokenPerTx`: 0 ≤ value ≤ 1,000,000 tokens
- **Duration:** 1 ≤ value ≤ 168 hours (1 week max)
- **Password:** Minimum 8 characters
- **Timestamp:** Must be within 5 minutes of server time

### 4. File Security

**Secure File Operations:**
- **Permissions:** Files written with `0o600` (owner read/write only)
- **Atomic Writes:** Uses temp file + rename to prevent race conditions
- **Directory Permissions:** Config directory created with `0o700`
- **Cleanup:** Temp files removed on error

**File Locations:**
- Config directory: `~/.maximus/`
- Temp file: `~/.maximus/delegate_temp.json`
- Final encrypted file: Created by Python CLI as `~/.maximus/delegate_key.enc`

## Setup Instructions

### Required Environment Variables

The server requires a 32-byte encryption key for encrypting delegation data:

```bash
DELEGATION_ENCRYPTION_KEY=<64-character-hex-string>
```

### Generating a Secure Encryption Key

**Method 1: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Method 2: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Method 3: Using Python**
```python
import secrets
print(secrets.token_hex(32))
```

### Setting the Environment Variable

**For Local Development:**

Create a `.env.local` file in the `web/` directory:
```bash
cd web
echo "DELEGATION_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" > .env.local
```

**For Production (Vercel, etc.):**

Set the environment variable in your deployment platform:
- Vercel: Settings → Environment Variables
- AWS: Use Parameter Store or Secrets Manager
- Docker: Pass via `-e` flag or `docker-compose.yml`

⚠️ **IMPORTANT:** Never commit the actual encryption key to version control!

## Security Best Practices

### For Developers

1. **Never Log Sensitive Data**
   - Don't log secret keys, passwords, or encryption keys
   - Be careful with error messages that might leak data

2. **Environment Variable Security**
   - Use secure secret management systems in production
   - Rotate encryption keys periodically
   - Never hardcode keys in source code

3. **API Security**
   - Always validate and sanitize inputs
   - Use TypeScript for type safety
   - Return generic error messages to users (log details server-side)

4. **File Permissions**
   - Always use restrictive permissions (`0o600` for files, `0o700` for directories)
   - Use atomic file operations to prevent race conditions

### For Users

1. **Wallet Security**
   - Only sign delegation messages from trusted sources
   - Review delegation parameters before signing
   - Use hardware wallets when possible

2. **Password Security**
   - Use strong, unique passwords (min 8 characters, recommend 16+)
   - Store passwords in a password manager
   - Don't reuse passwords from other services

3. **Monitoring**
   - Regularly check delegation status
   - Monitor wallet transactions
   - Revoke delegations when no longer needed

## Security Boundaries

### What This System Protects Against

✅ **Prevented Attacks:**
- Unauthorized delegation creation (requires wallet signature)
- Replay attacks (timestamp validation)
- Parameter tampering (signature includes all parameters)
- Plaintext credential theft (everything encrypted at rest)
- Race conditions (atomic file operations)
- Unauthorized file access (restrictive permissions)
- Input injection (comprehensive validation)

### What This System Does NOT Protect Against

❌ **Out of Scope:**
- Compromised server (attacker with server access can decrypt using env key)
- Stolen encryption key (store securely!)
- Malicious browser extensions (can intercept wallet signatures)
- Phishing attacks (always verify URLs)
- Compromised wallet (use hardware wallets for large amounts)

## Threat Model

### Assumptions

1. **Trusted Execution Environment:** The Next.js server runs in a secure environment
2. **Secure Key Storage:** The encryption key is stored securely (not in source control)
3. **User Authentication:** Users control their wallet private keys
4. **Transport Security:** HTTPS is used in production

### Adversaries

1. **Network Attacker:** Cannot decrypt traffic (HTTPS), cannot forge signatures
2. **File System Attacker:** Cannot read secrets (encrypted files, restrictive permissions)
3. **Unauthorized User:** Cannot create delegations (requires wallet signature)
4. **Replay Attacker:** Cannot reuse old requests (timestamp validation)

## Incident Response

If you suspect a security breach:

1. **Immediately Rotate Encryption Key**
   - Generate a new key
   - Update environment variables
   - Restart services

2. **Revoke Compromised Delegations**
   - Delete `~/.maximus/delegate_temp.json`
   - Delete `~/.maximus/delegate_key.enc`
   - Create new delegation with fresh keys

3. **Audit Wallet Transactions**
   - Check recent transactions on Solana explorer
   - Look for unauthorized activity

4. **Report Security Issues**
   - Create a private security advisory
   - Include details and reproduction steps
   - Allow time for patch before public disclosure

## Compliance & Auditing

### Logging

The system logs:
- API requests (without sensitive data)
- Signature verification failures
- Validation errors
- File operation failures

**Never Logged:**
- Secret keys
- Passwords
- Encryption keys
- Signature values (only success/failure)

### Audit Checklist

- [ ] Encryption key is securely stored (not in source control)
- [ ] HTTPS is enforced in production
- [ ] File permissions are correct (`0o600` for files, `0o700` for directories)
- [ ] Environment variables are properly configured
- [ ] Logs don't contain sensitive data
- [ ] Dependencies are up to date (run `npm audit`)

## Technical Details

### Cryptographic Specifications

**Message Signing (Authentication):**
- Algorithm: Ed25519 (via Solana wallet)
- Message Format: UTF-8 encoded string with delegation parameters
- Signature Format: Base64-encoded 64-byte signature

**Data Encryption (At-Rest):**
- Algorithm: AES-256-GCM
- Key Size: 256 bits (32 bytes)
- IV Size: 128 bits (16 bytes, randomly generated)
- Auth Tag: 128 bits (16 bytes)
- Encoding: Hex strings for storage

### Dependencies

**Critical Security Dependencies:**
- `tweetnacl` v1.0.3 - Signature verification
- `@solana/web3.js` v1.95.8 - Solana key validation
- `crypto` (Node.js built-in) - AES-256-GCM encryption

**Update Policy:**
- Review security advisories weekly
- Update dependencies monthly (or immediately for CVEs)
- Test thoroughly after updates

## Additional Resources

- [Solana Wallet Adapter Security](https://github.com/solana-labs/wallet-adapter)
- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [AES-GCM Security Considerations](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)

## Version History

- **v1.0.0** (2024-10-25): Initial secure implementation
  - Added wallet signature verification
  - Implemented AES-256-GCM encryption
  - Comprehensive input validation
  - Secure file operations with atomic writes

---

**Last Updated:** October 25, 2024  
**Security Contact:** [Your contact information]

