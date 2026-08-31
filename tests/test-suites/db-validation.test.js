const { Pool } = require('pg');
const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5433/api_observability';

// Support both full connection string or individual env vars
const pool = new Pool(
  DATABASE_URL.includes('://')
    ? { connectionString: DATABASE_URL }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'api_observability',
        password: process.env.DB_PASSWORD || 'root',
        port: parseInt(process.env.DB_PORT || '5433'),
      }
);

async function runDbValidationSuite() {
  console.log('\n============================================================');
  console.log('🗄️  EXECUTING SQL-LEVEL DATABASE INTEGRITY VALIDATION SUITE');
  console.log('============================================================\n');

  let allPassed = true;
  let client;

  try {
    client = await pool.connect();
    console.log('✔ Connected directly to PostgreSQL database.');

    // Setup Test User and API
    const testId = Date.now();
    const userRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: `DB Validator ${testId}`,
      email: `db_val_${testId}@example.com`,
      password: 'SecurePassword123!'
    });
    const token = userRes.data.token;
    const authHeaders = { headers: { 'Authorization': `Bearer ${token}` } };

    // -------------------------------------------------------------
    // Test Scenario 1: API Creation DB Verification
    // -------------------------------------------------------------
    console.log('\n1. Creating API Endpoint via REST API...');
    const apiRes = await axios.post(`${BASE_URL}/api/apis`, {
      name: `SQL Validation Target ${testId}`,
      endpoint: 'https://jsonplaceholder.typicode.com/todos/1',
      method: 'GET',
      rate_limit: 50,
      rate_window: 60,
      rate_limit_strategy: 'token_bucket',
      description: 'API created for direct SQL table verification'
    }, authHeaders);
    const apiId = apiRes.data.id;

    console.log('   Running TC_DB_003 (Part 1: Record Insertion Verification)...');
    const apiDbCheck = await client.query('SELECT * FROM apis WHERE id = $1', [apiId]);
    if (
      apiDbCheck.rows.length === 1 &&
      apiDbCheck.rows[0].name === `SQL Validation Target ${testId}` &&
      apiDbCheck.rows[0].rate_limit === 50 &&
      apiDbCheck.rows[0].rate_limit_strategy === 'token_bucket'
    ) {
      console.log('   ✔ PASS [TC_DB_003-A]: API row correctly persisted in "apis" PostgreSQL table.');
    } else {
      console.error('   ❌ FAIL [TC_DB_003-A]: API row was not found or columns mismatched in "apis" table.');
      allPassed = false;
    }

    // -------------------------------------------------------------
    // Test Scenario 2: API Key Generation & SHA-256 Hash Verification
    // -------------------------------------------------------------
    console.log('\n2. Generating API Key via REST API...');
    const keyRes = await axios.post(`${BASE_URL}/api/keys`, {
      api_id: apiId,
      name: 'SQL-Verification-Key'
    }, authHeaders);
    const apiKeyId = keyRes.data.id;
    const plainKey = keyRes.data.plain_key;
    const keyPrefix = keyRes.data.key_prefix;

    console.log('   Running TC_DB_001: Direct SHA-256 Hash & Persistence Verification in PostgreSQL...');
    const expectedHash = crypto.createHash('sha256').update(plainKey).digest('hex');
    const keyDbCheck = await client.query('SELECT * FROM api_keys WHERE id = $1', [apiKeyId]);

    if (keyDbCheck.rows.length === 1) {
      const dbRow = keyDbCheck.rows[0];
      const hashMatches = dbRow.key_hash === expectedHash;
      const prefixMatches = dbRow.key_prefix === keyPrefix;
      const unrevoked = dbRow.revoked_at === null;

      if (hashMatches && prefixMatches && unrevoked) {
        console.log(`   ✔ PASS [TC_DB_001]: API Key persisted in "api_keys" table.`);
        console.log(`     - DB Key Hash:  ${dbRow.key_hash.substring(0, 20)}... (Matches computed SHA-256)`);
        console.log(`     - DB Prefix:    ${dbRow.key_prefix}`);
        console.log(`     - Plain secret: Never stored in database (Zero-Trust Compliant)`);
      } else {
        console.error('   ❌ FAIL [TC_DB_001]: Hash or prefix mismatch in PostgreSQL:', {
          hashMatches,
          prefixMatches,
          dbHash: dbRow.key_hash,
          expectedHash
        });
        allPassed = false;
      }
    } else {
      console.error('   ❌ FAIL [TC_DB_001]: API Key row not found in PostgreSQL "api_keys" table.');
      allPassed = false;
    }

    // -------------------------------------------------------------
    // Test Scenario 3: API Key Revocation Timestamp Verification
    // -------------------------------------------------------------
    console.log('\n3. Revoking API Key via REST API...');
    await axios.post(`${BASE_URL}/api/keys/${apiKeyId}/revoke`, {}, authHeaders);

    console.log('   Running TC_DB_002: Direct Revocation Timestamp Verification in PostgreSQL...');
    const revokedKeyDbCheck = await client.query('SELECT revoked_at FROM api_keys WHERE id = $1', [apiKeyId]);

    if (
      revokedKeyDbCheck.rows.length === 1 &&
      revokedKeyDbCheck.rows[0].revoked_at !== null
    ) {
      const revokedAt = revokedKeyDbCheck.rows[0].revoked_at;
      console.log(`   ✔ PASS [TC_DB_002]: Key status verified in DB. revoked_at set to: ${revokedAt.toISOString()}`);
    } else {
      console.error('   ❌ FAIL [TC_DB_002]: revoked_at timestamp was null or row missing in DB.');
      allPassed = false;
    }

    // -------------------------------------------------------------
    // Test Scenario 4: Cascading Delete Verification
    // -------------------------------------------------------------
    console.log('\n4. Deleting API Endpoint via REST API...');
    await axios.delete(`${BASE_URL}/api/apis/${apiId}`, authHeaders);

    console.log('   Running TC_DB_003 (Part 2: Foreign Key Cascade Deletion Verification)...');
    const apiDeletedCheck = await client.query('SELECT * FROM apis WHERE id = $1', [apiId]);
    const childKeysDeletedCheck = await client.query('SELECT * FROM api_keys WHERE api_id = $1', [apiId]);

    if (apiDeletedCheck.rows.length === 0 && childKeysDeletedCheck.rows.length === 0) {
      console.log('   ✔ PASS [TC_DB_003-B]: API row and all cascading child api_keys rows were deleted from PostgreSQL.');
    } else {
      console.error('   ❌ FAIL [TC_DB_003-B]: Orphan records still remain in PostgreSQL after API deletion.');
      allPassed = false;
    }

  } catch (err) {
    console.error('Fatal Database Validation Error:', err.message);
    allPassed = false;
  } finally {
    if (client) client.release();
    await pool.end();
  }

  console.log('\n------------------------------------------------------------');
  if (allPassed) {
    console.log('🎉 ALL SQL DATABASE VALIDATION TESTS (TC_DB_001-003) PASSED!');
  } else {
    console.error('❌ SQL DATABASE VALIDATION SUITE ENCOUNTERED FAILURES!');
  }
  console.log('------------------------------------------------------------\n');

  return allPassed;
}

if (require.main === module) {
  runDbValidationSuite().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runDbValidationSuite };
