import assert from "node:assert";
import { storage } from "./src/lib/storage.ts";
import {
  generateRandomKey,
  exportKeyToUrlSafe,
  importKeyFromUrlSafe,
  encryptSecret,
  decryptSecret,
} from "./src/lib/crypto.ts";
import { parseEnv, generateEnvExample } from "./src/lib/envParser.ts";

async function runIntegrationSuite() {
  console.log("==================================================");
  console.log("🚀 STARTING ENVSHARE END-TO-END INTEGRATION SUITE");
  console.log("==================================================");

  // --- Scenario 1: Standard Secret with Burn-After-Reading (1 View) ---
  console.log("\n🧪 Test Scenario 1: Standard Secret (1 View Burn-After-Reading)");
  const rawKey1 = generateRandomKey();
  const sampleEnv = `DB_HOST=cluster.internal
DB_PASS="s3cur3_p@ssw0rd!"
SECRET_TOKEN=tok_live_123456789`;

  const encrypted1 = await encryptSecret(sampleEnv, rawKey1);
  const stored1 = await storage.saveSecret({
    ciphertext: encrypted1.ciphertext,
    iv: encrypted1.iv,
    hasPassword: false,
    ttlSeconds: 3600,
    maxViews: 1,
  });

  assert.ok(stored1.id, "Secret ID should be generated");
  assert.ok(stored1.deletionToken, "Deletion token should be generated");
  console.log(`  ✓ Secret created with ID: ${stored1.id}`);

  // Bot preview simulation (Slack / Discord crawler hitting metadata)
  for (let i = 1; i <= 5; i++) {
    const meta = await storage.getSecretMeta(stored1.id);
    assert.strictEqual(meta.exists, true, "Secret must exist");
    assert.strictEqual(meta.remainingViews, 1, "Metadata GET must NOT decrement views!");
  }
  console.log("  ✓ Bot crawl protection verified: 5 crawler GET requests did not burn the secret.");

  // Actual human reveal
  const revealed1 = await storage.revealSecret(stored1.id);
  assert.ok(revealed1, "Reveal must return payload");
  assert.strictEqual(revealed1.remainingViews, 0, "Remaining views should be 0");

  // Decrypt locally
  const decrypted1 = await decryptSecret(revealed1, rawKey1);
  assert.strictEqual(decrypted1, sampleEnv, "Decrypted content must match original .env");
  console.log("  ✓ Human reveal & client-side AES-256-GCM decryption succeeded.");

  // Attempt second reveal (should be burned)
  const burnedMeta = await storage.getSecretMeta(stored1.id);
  assert.strictEqual(burnedMeta.exists, false, "Burned secret must no longer exist");
  const secondReveal = await storage.revealSecret(stored1.id);
  assert.strictEqual(secondReveal, null, "Second reveal must return null");
  console.log("  ✓ Burn-after-reading verified: Secret was permanently expunged.");

  // --- Scenario 2: Two-Factor Passphrase Protected Secret ---
  console.log("\n🧪 Test Scenario 2: Two-Factor Passphrase Protection");
  const rawKey2 = generateRandomKey();
  const password = "correct-battery-horse-staple";
  const encrypted2 = await encryptSecret(sampleEnv, rawKey2, password);

  const stored2 = await storage.saveSecret({
    ciphertext: encrypted2.ciphertext,
    iv: encrypted2.iv,
    salt: encrypted2.salt,
    hasPassword: true,
    ttlSeconds: 3600,
    maxViews: 3,
  });

  const revealed2 = await storage.revealSecret(stored2.id);
  assert.ok(revealed2, "Reveal payload returned");
  assert.strictEqual(revealed2.hasPassword, true, "hasPassword flag preserved");

  // Wrong password fails
  let failed = false;
  try {
    await decryptSecret(revealed2, rawKey2, "wrong-password");
  } catch {
    failed = true;
  }
  assert.strictEqual(failed, true, "Wrong password must fail decryption");
  console.log("  ✓ Wrong password was rejected by auth tag.");

  // Correct password succeeds
  const decrypted2 = await decryptSecret(revealed2, rawKey2, password);
  assert.strictEqual(decrypted2, sampleEnv, "Correct password successfully decrypted secret");
  console.log("  ✓ Correct password decrypted secret cleanly.");

  // --- Scenario 3: Sender Kill Switch (Manual Incineration) ---
  console.log("\n🧪 Test Scenario 3: Sender Manual Kill Switch");
  const stored3 = await storage.saveSecret({
    ciphertext: encrypted1.ciphertext,
    iv: encrypted1.iv,
    hasPassword: false,
    ttlSeconds: 3600,
    maxViews: 5,
  });

  // Invalid deletion token fails
  const failedDelete = await storage.deleteSecret(stored3.id, "fake-token");
  assert.strictEqual(failedDelete, false, "Invalid deletion token must be rejected");

  // Valid deletion token burns immediately
  const successDelete = await storage.deleteSecret(stored3.id, stored3.deletionToken);
  assert.strictEqual(successDelete, true, "Valid deletion token must destroy secret");

  const metaAfterDelete = await storage.getSecretMeta(stored3.id);
  assert.strictEqual(metaAfterDelete.exists, false, "Secret must be gone after kill switch");
  console.log("  ✓ Sender kill switch burned secret immediately.");

  // --- Scenario 4: .env Parser and .env.example Generation ---
  console.log("\n🧪 Test Scenario 4: .env Parsing & Linter");
  const complexEnv = `# Production config
APP_PORT=3000 # default port
API_KEY="sk_live_12345"
DATABASE_URL=postgres://user:pass@localhost:5432/db
INVALID_SPACED_KEY = bad_value
APP_PORT=3001
`;

  const parsed = parseEnv(complexEnv);
  assert.strictEqual(parsed.pairs.length, 5, "Should find 5 key-value pairs");
  assert.ok(parsed.duplicateKeys.includes("APP_PORT"), "Duplicate key APP_PORT detected");
  assert.ok(parsed.warnings.length >= 2, "Warnings generated for spaces and duplicates");

  const example = generateEnvExample(complexEnv);
  assert.ok(example.includes("APP_PORT="), "Keeps keys");
  assert.ok(!example.includes("sk_live_12345"), "Sanitizes secret values");
  console.log("  ✓ .env parser, linter warnings, and .env.example generation verified.");

  console.log("\n==================================================");
  console.log("🎉 ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!");
  console.log("==================================================");
}

runIntegrationSuite().catch((err) => {
  console.error("❌ Integration test failed:", err);
  process.exit(1);
});
