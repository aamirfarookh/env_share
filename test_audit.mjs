import assert from "node:assert";
import { buildEnvMatrix, extractMissingKeysTemplate, isPlaceholder } from "./src/lib/envMatrix.ts";
import { scanCodeString, auditCodeAgainstEnv } from "./src/lib/codeScanner.ts";

async function runAuditTests() {
  console.log("==================================================");
  console.log("🚀 RUNNING ENVAUDIT ENGINE TEST SUITE");
  console.log("==================================================");

  // --- Test 1: Placeholder Detection ---
  console.log("\n🧪 Test 1: Placeholder Detection");
  assert.strictEqual(isPlaceholder("localhost"), true);
  assert.strictEqual(isPlaceholder("postgres://user:change_me@localhost:5432/db"), true);
  assert.strictEqual(isPlaceholder("your_key_here"), true);
  assert.strictEqual(isPlaceholder("sk_live_real_key_123456789"), false);
  assert.strictEqual(isPlaceholder("postgresql://prod_user:p@ss123@prod.rds.aws.internal/mydb"), false);
  console.log("  ✔ Placeholder detection verified");

  // --- Test 2: Matrix & Drift Comparison ---
  console.log("\n🧪 Test 2: Multi-Env Drift Matrix");
  const envs = [
    {
      id: "staging",
      name: "Staging",
      content: `DATABASE_URL=postgres://staging:db@host:5432/app\nNEW_FEATURE_FLAG=true\nPOSTMARK_KEY=pm_123`,
    },
    {
      id: "production",
      name: "Production",
      isProduction: true,
      content: `DATABASE_URL=postgres://localhost:5432/app\nPOSTMARK_KEY=pm_live_999`, // Missing NEW_FEATURE_FLAG, placeholder in DB
    },
  ];

  const matrix = buildEnvMatrix(envs);
  assert.strictEqual(matrix.totalKeys, 3);
  assert.strictEqual(matrix.criticalIssuesCount, 1, "NEW_FEATURE_FLAG missing in production");
  assert.strictEqual(matrix.placeholderWarningsCount, 1, "DATABASE_URL contains localhost in production");
  assert.ok(matrix.healthScore < 80, "Health score must be penalized for prod drift");

  const missingTemplate = extractMissingKeysTemplate(envs, "production");
  assert.ok(missingTemplate.includes("NEW_FEATURE_FLAG"), "Extracted missing keys contains NEW_FEATURE_FLAG");
  console.log("  ✔ Drift matrix calculation and missing keys extraction verified");

  // --- Test 3: Code AST & Pattern Scanner ---
  console.log("\n🧪 Test 3: Code AST & Pattern Scanner");
  const sampleCode = `
    const apiKey = process.env.STRIPE_SECRET_KEY;
    const webhook = process.env['STRIPE_WEBHOOK_SECRET_V2'];
    const viteKey = import.meta.env.VITE_PUBLIC_API;
    const py = os.environ.get("PYTHON_SERVICE_URL");
    const pyDirect = os.environ["PYTHON_DB_PASS"];
  `;

  const detected = scanCodeString(sampleCode, "service.ts");
  const detectedKeys = detected.map((d) => d.key);
  assert.ok(detectedKeys.includes("STRIPE_SECRET_KEY"));
  assert.ok(detectedKeys.includes("STRIPE_WEBHOOK_SECRET_V2"));
  assert.ok(detectedKeys.includes("VITE_PUBLIC_API"));
  assert.ok(detectedKeys.includes("PYTHON_SERVICE_URL"));
  assert.ok(detectedKeys.includes("PYTHON_DB_PASS"));
  console.log("  ✔ Scanner correctly identified JS, TS, Vite, and Python environment patterns");

  // --- Test 4: Cross-Reference Code vs Env ---
  console.log("\n🧪 Test 4: Cross-Reference Code vs Env");
  const declaredInEnv = ["STRIPE_SECRET_KEY", "VITE_PUBLIC_API", "OLD_UNUSED_KEY"];
  const audit = auditCodeAgainstEnv(detected, declaredInEnv);

  assert.ok(audit.undeclaredKeys.includes("STRIPE_WEBHOOK_SECRET_V2"), "Undeclared webhook detected as crash hazard");
  assert.ok(audit.undeclaredKeys.includes("PYTHON_SERVICE_URL"), "Undeclared python var detected");
  assert.ok(audit.unusedKeys.includes("OLD_UNUSED_KEY"), "Old unused key detected as dead configuration");
  assert.ok(audit.coveredKeys.includes("STRIPE_SECRET_KEY"), "Covered key correctly classified");
  console.log("  ✔ Cross-referencing correctly flagged undeclared crash risks and dead keys");

  console.log("\n==================================================");
  console.log("🎉 ALL ENVAUDIT ENGINE TESTS PASSED (100%)!");
  console.log("==================================================");
}

runAuditTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
