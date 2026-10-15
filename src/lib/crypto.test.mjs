import {
  generateRandomKey,
  exportKeyToUrlSafe,
  importKeyFromUrlSafe,
  encryptSecret,
  decryptSecret,
} from "./crypto.ts";
import assert from "node:assert";

async function runTests() {
  console.log("▶ Running Crypto Self-Tests...");

  // Test 1: Key generation and serialization
  const key1 = generateRandomKey();
  assert.strictEqual(key1.length, 32, "Key should be 32 bytes (256 bits)");
  const serialized = exportKeyToUrlSafe(key1);
  const deserialized = importKeyFromUrlSafe(serialized);
  assert.deepStrictEqual(key1, deserialized, "Key serialization roundtrip failed");
  console.log("✔ Test 1 Passed: Key generation and Base64URL roundtrip");

  // Test 2: Basic Encryption & Decryption without password
  const secretContent = `DATABASE_URL=postgres://user:super_secret_pw@db.prod.internal:5432/mydb
STRIPE_SECRET_KEY=sk_live_51AbcDef123456789
API_KEY=xoxb-123456789-abcdef`;

  const encrypted1 = await encryptSecret(secretContent, key1);
  assert.strictEqual(encrypted1.hasPassword, false);
  assert.ok(encrypted1.ciphertext.length > 0);
  assert.ok(encrypted1.iv.length > 0);
  assert.strictEqual(encrypted1.salt, undefined);

  const decrypted1 = await decryptSecret(encrypted1, key1);
  assert.strictEqual(decrypted1, secretContent, "Decrypted content does not match original");
  console.log("✔ Test 2 Passed: AES-256-GCM encryption & decryption without password");

  // Test 3: Encryption & Decryption WITH password
  const password = "my-secure-company-passphrase-2026!";
  const encrypted2 = await encryptSecret(secretContent, key1, password);
  assert.strictEqual(encrypted2.hasPassword, true);
  assert.ok(encrypted2.salt, "Salt must be present when password is used");

  // Success with correct password
  const decrypted2 = await decryptSecret(encrypted2, key1, password);
  assert.strictEqual(decrypted2, secretContent, "Decrypted content with password failed");

  // Failure with wrong password
  let failed = false;
  try {
    await decryptSecret(encrypted2, key1, "wrong-password");
  } catch (e) {
    failed = true;
  }
  assert.strictEqual(failed, true, "Decryption must fail with wrong password");
  console.log("✔ Test 3 Passed: AES-256-GCM + PBKDF2 with password verification & wrong password rejection");

  // Test 4: Tamper Resistance (GCM auth tag verification)
  let tamperedCiphertext = encrypted1.ciphertext.substring(0, encrypted1.ciphertext.length - 2) + "==";
  let tamperCaught = false;
  try {
    await decryptSecret({ ...encrypted1, ciphertext: tamperedCiphertext }, key1);
  } catch (e) {
    tamperCaught = true;
  }
  assert.strictEqual(tamperCaught, true, "Decryption must fail when ciphertext is modified");
  console.log("✔ Test 4 Passed: Authenticated encryption correctly rejects tampered ciphertext");

  console.log("🎉 ALL CRYPTO TESTS PASSED!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
