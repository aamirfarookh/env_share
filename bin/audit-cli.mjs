#!/usr/bin/env node

/**
 * EnvAudit CLI & CI/CD Runner
 * 
 * Usage:
 *   # Diff multiple environment files
 *   node bin/audit-cli.mjs diff .env.local .env.staging .env.production
 * 
 *   # CI/CD Gatekeeper: check codebase against .env.example
 *   node bin/audit-cli.mjs check --example .env.example --src ./src
 */

import fs from "node:fs";
import path from "node:path";

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const map = new Map();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      let key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (key.startsWith("export ")) key = key.replace(/^export\s+/, "");
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      map.set(key, val);
    }
  }
  return map;
}

function scanDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === "node_modules" || file === ".git" || file === ".next") continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath, fileList);
    } else if (/\.(js|jsx|ts|tsx|py|go|mjs)$/.test(file)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const REGEX_PATTERNS = [
  /process\.env\.([A-Z0-9_]+)/g,
  /process\.env\[['"]([A-Z0-9_]+)['"]\]/g,
  /import\.meta\.env\.([A-Z0-9_]+)/g,
  /os\.(?:environ\.get|getenv)\(['"]([A-Z0-9_]+)['"]/g,
  /os\.environ\['([A-Z0-9_]+)'\]/g,
  /os\.Getenv\(['"]([A-Z0-9_]+)['"]\)/g,
];

const IGNORE_KEYS = new Set([
  "NODE_ENV", "PORT", "HOST", "PWD", "PATH", "HOME", "USER", "CI"
]);

function scanFilesForEnv(filePaths) {
  const references = new Map(); // key -> [{ file, line }]
  for (const file of filePaths) {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      for (const pattern of REGEX_PATTERNS) {
        pattern.lastIndex = 0;
        let match;
        while ((match = pattern.exec(lineText)) !== null) {
          const key = match[1];
          if (IGNORE_KEYS.has(key)) continue;
          if (!references.has(key)) references.set(key, []);
          references.get(key).push({ file, line: i + 1, text: lineText.trim() });
        }
      }
    }
  }
  return references;
}

async function handleCheck(args) {
  let examplePath = ".env.example";
  let srcDir = "./src";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--example" && args[i + 1]) examplePath = args[++i];
    if (args[i] === "--src" && args[i + 1]) srcDir = args[++i];
  }

  console.log(`\n🔍 EnvAudit CI Check:`);
  console.log(`   Scanning directory: ${srcDir}`);
  console.log(`   Verifying against:  ${examplePath}\n`);

  const exampleEnv = parseEnvFile(examplePath);
  const files = scanDir(srcDir);
  const codeRefs = scanFilesForEnv(files);

  const undeclared = [];
  for (const [key, occs] of codeRefs.entries()) {
    if (!exampleEnv.has(key)) {
      undeclared.push({ key, occurrences: occs });
    }
  }

  if (undeclared.length > 0) {
    console.error(`🚨 AUDIT FAILED: ${undeclared.length} undeclared environment variable(s) found in code!\n`);
    for (const item of undeclared) {
      console.error(`   ❌ ${item.key}`);
      for (const occ of item.occurrences) {
        console.error(`      └─ ${occ.file}:${occ.line} -> ${occ.text}`);
      }
    }
    console.error(`\n💡 Fix: Add these variables to '${examplePath}' before merging.\n`);
    process.exit(1);
  }

  console.log(`✅ AUDIT PASSED: All ${codeRefs.size} code-referenced environment variables are declared in '${examplePath}'.\n`);
  process.exit(0);
}

async function handleDiff(files) {
  if (files.length < 2) {
    console.error("Usage: node bin/audit-cli.mjs diff <env1> <env2> [env3...]");
    process.exit(1);
  }

  const parsedEnvs = files.map((f) => ({
    fileName: path.basename(f),
    map: parseEnvFile(f),
  }));

  const allKeys = new Set();
  for (const e of parsedEnvs) {
    for (const k of e.map.keys()) allKeys.add(k);
  }

  console.log(`\n📊 Multi-Environment Matrix Diff:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`VARIABLE`.padEnd(30) + parsedEnvs.map((e) => e.fileName.padEnd(20)).join(""));
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  let missingCount = 0;
  for (const key of Array.from(allKeys).sort()) {
    let rowStr = key.padEnd(30);
    for (const e of parsedEnvs) {
      if (e.map.has(key)) {
        rowStr += `✔ Present`.padEnd(20);
      } else {
        missingCount++;
        rowStr += `❌ MISSING`.padEnd(20);
      }
    }
    console.log(rowStr);
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Total Keys: ${allKeys.size} | Total Missing Occurrences: ${missingCount}\n`);
}

async function main() {
  const command = process.argv[2];
  const rest = process.argv.slice(3);

  if (command === "check") {
    await handleCheck(rest);
  } else if (command === "diff") {
    await handleDiff(rest);
  } else {
    console.log(`
  📊 EnvAudit & Drift Guard CLI

  Usage:
    node bin/audit-cli.mjs diff <file1> <file2> [file3...]
    node bin/audit-cli.mjs check --example .env.example --src ./src

  Commands:
    diff      Compares 2 or more .env files side-by-side
    check     CI/CD gatekeeper: verifies that all code references exist in .env.example
    `);
  }
}

main().catch(console.error);
