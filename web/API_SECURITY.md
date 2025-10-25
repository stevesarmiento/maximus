# API Security Documentation

## Overview

The `/api/wallets` endpoints have been secured with authentication, authorization, rate-limiting, and input validation to protect against unauthorized access and abuse.

## Security Features

### 1. Authentication

All endpoints (GET, POST, DELETE) now require authentication via API key or Bearer token.

**Authentication Methods:**

- **X-API-Key Header** (Recommended for API clients)
  ```bash
  curl -H "X-API-Key: your-secret-api-key-here" http://localhost:3000/api/wallets
  ```

- **Authorization Bearer Token** (Standard OAuth-style)
  ```bash
  curl -H "Authorization: Bearer your-secret-token-here" http://localhost:3000/api/wallets
  ```

**Key Requirements:**
- Minimum 32 characters
- Generate secure random tokens (e.g., using `crypto.randomBytes(32).toString('hex')`)

**Unauthenticated Response:**
```json
{
  "error": "Unauthorized. Provide a valid API key via X-API-Key header or Authorization Bearer token."
}
```
Status: `401 Unauthorized`

### 2. Authorization

Users can only access and modify their own wallet entries. The system:
- Associates each wallet with a user ID (derived from their API key)
- Filters GET requests to only return the authenticated user's wallets
- Prevents users from deleting wallets they don't own
- Prevents duplicate wallets within a user's collection

**Example:**
- User A cannot see or delete User B's wallets
- Each user has an isolated wallet collection

### 3. Rate Limiting

**Limits:**
- 20 requests per minute per user
- Sliding window implementation

**Rate Limit Headers:**
```
X-RateLimit-Limit: 20
X-RateLimit-Reset: 1735123456
Retry-After: 45
```

**Rate Limited Response:**
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```
Status: `429 Too Many Requests`

### 4. Input Validation

**POST/DELETE Request Validation:**

✅ **Valid Input:**
```json
{
  "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "label": "My Main Wallet"
}
```

❌ **Invalid Inputs:**
- Non-string address or label
- Address too short (<32 chars) or too long (>44 chars)
- Invalid base58 characters
- Label exceeding 100 characters
- Malformed JSON body

**Validation Error Response:**
```json
{
  "error": "Invalid wallet address length"
}
```
Status: `400 Bad Request`

### 5. Additional Protection

**Per-User Wallet Limit:**
- Maximum 100 wallets per user
- Prevents resource exhaustion

**Concurrent Access Protection:**
- File locking prevents race conditions
- Atomic read-modify-write operations

## API Endpoints

### GET /api/wallets

List all wallets for the authenticated user.

**Request:**
```bash
curl -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/wallets
```

**Response:**
```json
{
  "wallets": [
    {
      "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "label": "Main Wallet",
      "added_at": "2025-10-25T12:00:00.000Z",
      "user_id": "sha256-hash-of-api-key"
    }
  ],
  "count": 1
}
```
Status: `200 OK`

### POST /api/wallets

Add a new wallet for the authenticated user.

**Request:**
```bash
curl -X POST \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"address":"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU","label":"My Wallet"}' \
  http://localhost:3000/api/wallets
```

**Response:**
```json
{
  "wallet": {
    "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "label": "My Wallet",
    "added_at": "2025-10-25T12:00:00.000Z",
    "user_id": "sha256-hash-of-api-key"
  }
}
```
Status: `201 Created`

**Error Responses:**
- `400` - Invalid input
- `409` - Wallet already exists
- `429` - Wallet limit exceeded (100 max)

### DELETE /api/wallets

Remove a wallet from the authenticated user's collection.

**Request:**
```bash
curl -X DELETE \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"address":"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"}' \
  http://localhost:3000/api/wallets
```

**Response:**
```json
{
  "success": true,
  "message": "Wallet removed successfully"
}
```
Status: `200 OK`

**Error Responses:**
- `400` - Invalid input
- `404` - Wallet not found or unauthorized

## Implementation Details

### User Identification

Users are identified by a SHA-256 hash of their API key/token:
```typescript
const userId = crypto.createHash("sha256").update(token).digest("hex");
```

This approach:
- Provides consistent user IDs
- Doesn't store tokens in plaintext
- Enables multi-tenant isolation

### Rate Limiting Strategy

**In-Memory Store:**
- Uses a Map to track request counts per user
- Sliding window with automatic cleanup
- 1% probability of cleanup on each request

**Production Considerations:**
- Replace with Redis for distributed systems
- Add persistent storage for rate limit state
- Consider API gateway solutions (e.g., Cloudflare, Kong)

### Migration from Unprotected Endpoints

Existing wallets in the system don't have a `user_id` field. To handle this:

1. **Backward Compatibility:** Wallets without `user_id` won't be visible to authenticated users
2. **Migration Script:** Run this to assign existing wallets to a default user:

```typescript
// migration script (run once)
const config = await readConfig();
const defaultUserId = "default-user-id"; // Set appropriately

config.wallets = config.wallets.map(wallet => ({
  ...wallet,
  user_id: wallet.user_id || defaultUserId
}));

await writeConfig(config);
```

## Testing

### Generate Test API Key

```bash
# Generate a secure random API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Example Test Requests

```bash
# Set your API key
export API_KEY="your-generated-api-key"

# Test GET
curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/wallets

# Test POST
curl -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"address":"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU","label":"Test"}' \
  http://localhost:3000/api/wallets

# Test DELETE
curl -X DELETE \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"address":"7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"}' \
  http://localhost:3000/api/wallets

# Test rate limiting (run 25 times quickly)
for i in {1..25}; do
  curl -H "X-API-Key: $API_KEY" http://localhost:3000/api/wallets
done
```

## Security Best Practices

### For Development

1. **Use Environment Variables:**
   ```bash
   # .env.local
   NEXT_PUBLIC_API_KEY=your-dev-api-key
   ```

2. **Never Commit API Keys:**
   - Add `.env.local` to `.gitignore`
   - Use different keys for dev/staging/production

### For Production

1. **Upgrade to OAuth/Session-Based Auth:**
   - Consider NextAuth.js for session management
   - Implement proper user registration/login
   - Use database for user/wallet storage

2. **Enhance Rate Limiting:**
   - Move to Redis or similar distributed cache
   - Implement progressive delays
   - Add IP-based rate limiting

3. **Add Request Logging:**
   - Log authentication attempts
   - Monitor for suspicious patterns
   - Set up alerts for rate limit violations

4. **HTTPS Only:**
   - Enforce HTTPS in production
   - Use secure headers (HSTS, CSP)

5. **API Key Rotation:**
   - Implement key expiration
   - Support multiple keys per user
   - Provide key revocation mechanism

## Troubleshooting

### Common Issues

**401 Unauthorized:**
- Check that API key is being sent in headers
- Verify key length (minimum 32 characters)
- Ensure no extra spaces in header value

**429 Rate Limited:**
- Wait for the `Retry-After` duration
- Check `X-RateLimit-Reset` header
- Consider reducing request frequency

**400 Bad Request:**
- Validate JSON payload format
- Check wallet address format (base58, 32-44 chars)
- Ensure label doesn't exceed 100 characters

## Future Enhancements

1. **API Key Management Dashboard:**
   - Generate/revoke keys via UI
   - View usage statistics
   - Set custom rate limits

2. **Advanced Authorization:**
   - Role-based access control (RBAC)
   - Shared wallet collections
   - Team/organization support

3. **Audit Logging:**
   - Track all wallet operations
   - Export audit logs
   - Compliance reporting

4. **WebSocket Support:**
   - Real-time wallet updates
   - Push notifications for changes

## Support

For questions or issues related to API security:
1. Check this documentation first
2. Review error messages and status codes
3. Check application logs
4. Consult the [SECURITY.md](./SECURITY.md) file for reporting vulnerabilities

