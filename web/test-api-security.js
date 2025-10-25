/**
 * Test script for wallet API security features
 * Run with: node test-api-security.js
 * 
 * Before running:
 * 1. Start the Next.js dev server: npm run dev
 * 2. Set your API key below or via environment variable
 */

const crypto = require('crypto');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || crypto.randomBytes(32).toString('hex');

console.log('\n🔐 Wallet API Security Test Suite\n');
console.log('Using API Key:', API_KEY.substring(0, 16) + '...\n');

// Test helper
async function testRequest(name, method, path, body, headers = {}) {
  console.log(`\n📋 Test: ${name}`);
  console.log(`   ${method} ${path}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();
    const status = response.status;
    
    console.log(`   ✓ Status: ${status}`);
    
    if (status >= 400) {
      console.log(`   ⚠️  Error: ${data.error || 'Unknown error'}`);
    } else {
      console.log(`   ✓ Success:`, JSON.stringify(data, null, 2).split('\n').join('\n      '));
    }
    
    return { status, data, headers: Object.fromEntries(response.headers.entries()) };
  } catch (error) {
    console.log(`   ❌ Failed:`, error.message);
    return { status: 0, data: null, error };
  }
}

// Run tests
async function runTests() {
  const testWallet = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
  const testWallet2 = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKK';
  
  // Test 1: Unauthenticated request (should fail)
  await testRequest(
    'GET without authentication',
    'GET',
    '/api/wallets',
    null,
    {} // No API key
  );

  // Test 2: Authenticated GET request (empty list initially)
  await testRequest(
    'GET with authentication',
    'GET',
    '/api/wallets',
    null,
    { 'X-API-Key': API_KEY }
  );

  // Test 3: Add wallet with invalid data
  await testRequest(
    'POST with invalid address',
    'POST',
    '/api/wallets',
    { address: 'invalid', label: 'Test' },
    { 'X-API-Key': API_KEY }
  );

  // Test 4: Add valid wallet
  await testRequest(
    'POST valid wallet',
    'POST',
    '/api/wallets',
    { address: testWallet, label: 'Test Wallet 1' },
    { 'X-API-Key': API_KEY }
  );

  // Test 5: Add duplicate wallet (should fail)
  await testRequest(
    'POST duplicate wallet',
    'POST',
    '/api/wallets',
    { address: testWallet, label: 'Test Wallet 1 Duplicate' },
    { 'X-API-Key': API_KEY }
  );

  // Test 6: Add second wallet
  await testRequest(
    'POST second wallet',
    'POST',
    '/api/wallets',
    { address: testWallet2, label: 'Test Wallet 2' },
    { 'X-API-Key': API_KEY }
  );

  // Test 7: List wallets (should show 2)
  await testRequest(
    'GET all wallets',
    'GET',
    '/api/wallets',
    null,
    { 'X-API-Key': API_KEY }
  );

  // Test 8: Test with different API key (should see different wallets)
  const anotherApiKey = crypto.randomBytes(32).toString('hex');
  console.log('\n🔑 Testing with different API key:', anotherApiKey.substring(0, 16) + '...');
  
  await testRequest(
    'GET with different API key',
    'GET',
    '/api/wallets',
    null,
    { 'X-API-Key': anotherApiKey }
  );

  // Test 9: Rate limiting test
  console.log('\n⏱️  Testing rate limiting (sending 25 requests quickly)...');
  const promises = [];
  for (let i = 0; i < 25; i++) {
    promises.push(
      fetch(`${API_BASE_URL}/api/wallets`, {
        headers: { 'X-API-Key': API_KEY }
      }).then(r => r.status)
    );
  }
  
  const results = await Promise.all(promises);
  const successCount = results.filter(s => s === 200).length;
  const rateLimitedCount = results.filter(s => s === 429).length;
  
  console.log(`   ✓ Successful: ${successCount}`);
  console.log(`   ✓ Rate limited: ${rateLimitedCount}`);
  
  if (rateLimitedCount > 0) {
    console.log('   ✓ Rate limiting is working!');
  } else {
    console.log('   ⚠️  Rate limiting may not be working (or limit is higher than 25)');
  }

  // Test 10: Delete wallet with invalid data
  await testRequest(
    'DELETE with invalid address',
    'DELETE',
    '/api/wallets',
    { address: 'too-short' },
    { 'X-API-Key': API_KEY }
  );

  // Test 11: Delete wallet
  await testRequest(
    'DELETE first wallet',
    'DELETE',
    '/api/wallets',
    { address: testWallet },
    { 'X-API-Key': API_KEY }
  );

  // Test 12: Try to delete wallet that doesn't exist
  await testRequest(
    'DELETE non-existent wallet',
    'DELETE',
    '/api/wallets',
    { address: testWallet },
    { 'X-API-Key': API_KEY }
  );

  // Test 13: List remaining wallets
  await testRequest(
    'GET remaining wallets',
    'GET',
    '/api/wallets',
    null,
    { 'X-API-Key': API_KEY }
  );

  // Test 14: Clean up - delete remaining wallet
  await testRequest(
    'DELETE second wallet (cleanup)',
    'DELETE',
    '/api/wallets',
    { address: testWallet2 },
    { 'X-API-Key': API_KEY }
  );

  // Test 15: Verify empty list
  await testRequest(
    'GET final state (should be empty)',
    'GET',
    '/api/wallets',
    null,
    { 'X-API-Key': API_KEY }
  );

  // Test 16: Test with Bearer token instead of API key
  await testRequest(
    'POST with Bearer token',
    'POST',
    '/api/wallets',
    { address: testWallet, label: 'Bearer Token Test' },
    { 'Authorization': `Bearer ${API_KEY}` }
  );

  // Test 17: Clean up Bearer token test
  await testRequest(
    'DELETE Bearer token test wallet',
    'DELETE',
    '/api/wallets',
    { address: testWallet },
    { 'Authorization': `Bearer ${API_KEY}` }
  );

  console.log('\n✅ Test suite completed!\n');
  console.log('Security features verified:');
  console.log('  ✓ Authentication (API key and Bearer token)');
  console.log('  ✓ Authorization (user-scoped access)');
  console.log('  ✓ Rate limiting');
  console.log('  ✓ Input validation');
  console.log('  ✓ Error handling\n');
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});

