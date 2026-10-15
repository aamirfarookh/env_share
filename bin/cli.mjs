#!/usr/bin/env node

/**
 * EnvShare CLI Companion
 * 
 * Usage:
 *   node bin/cli.mjs .env
 *   cat .env | node bin/cli.mjs
 *   node bin/cli.mjs .env --views 1 --ttl 3600 --host http://localhost:3000
 */

import fs from "node:fs";
import { webcrypto } from "node:crypto";

const subtle = webcrypto.subtle;

function uint8ArrayToBase64Url(bytes) {
  const binary = Buffer.from(bytes).toString("binary");
  const base64 = Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function encryptSecret(plaintext, rawKeyBytes, passphrase) {
  const iv = new Uint8Array(12);
  webcrypto.getRandomValues(iv);

  let salt;
  let cryptoKey;

  if (passphrase) {
    salt = new Uint8Array(16);
    webcrypto.getRandomValues(salt);

    const passBytes = new TextEncoder().encode(passphrase);
    const composite = new Uint8Array(rawKeyBytes.length + passBytes.length);
    composite.set(rawKeyBytes, 0);
    composite.set(passBytes, rawKeyBytes.length);

    const baseKey = await subtle.importKey(
      "raw",
      composite,
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    cryptoKey = await subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  } else {
    cryptoKey = await subtle.importKey(
      "raw",
      rawKeyBytes,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  const encodedData = new TextEncoder().encode(plaintext);
  const encryptedBuffer = await subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encodedData
  );

  return {
    ciphertext: uint8ArrayToBase64Url(new Uint8Array(encryptedBuffer)),
    iv: uint8ArrayToBase64Url(iv),
    salt: salt ? uint8ArrayToBase64Url(salt) : undefined,
    hasPassword: Boolean(passphrase),
  };
}

async function main() {
  const args = process.argv.slice(2);
  let filePath = null;
  let ttlSeconds = 3600;
  let maxViews = 1;
  let passphrase = null;
  let host = process.env.ENVSHARE_HOST || "http://localhost:3000";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--ttl" && args[i + 1]) {
      ttlSeconds = parseInt(args[++i], 10);
    } else if (args[i] === "--views" && args[i + 1]) {
      maxViews = parseInt(args[++i], 10);
    } else if (args[i] === "--password" && args[i + 1]) {
      passphrase = args[++i];
    } else if (args[i] === "--host" && args[i + 1]) {
      host = args[++i].replace(/\/$/, "");
    } else if (!args[i].startsWith("-") && !filePath) {
      filePath = args[i];
    }
  }

  let content = "";
  if (filePath) {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Error: File '${filePath}' not found.`);
      process.exit(1);
    }
    content = fs.readFileSync(filePath, "utf8");
  } else {
    // Read from standard input if piped
    if (process.stdin.isTTY) {
      console.log(`
  🔒 EnvShare CLI - Zero-Knowledge Secret Sharing

  Usage:
    node bin/cli.mjs <file> [options]
    cat .env | node bin/cli.mjs [options]

  Options:
    --views <number>     Max views before self-destruction (default: 1)
    --ttl <seconds>      Expiration in seconds (default: 3600 = 1 hour)
    --password <string>  Optional passphrase protection
    --host <url>         EnvShare instance URL (default: http://localhost:3000)
      `);
      process.exit(0);
    }
    content = await new Promise((resolve) => {
      let data = "";
      process.stdin.on("data", (chunk) => (data += chunk));
      process.stdin.on("end", () => resolve(data));
    });
  }

  if (!content.trim()) {
    console.error("❌ Error: Content is empty.");
    process.exit(1);
  }

  console.log("🔐 Encrypting secrets client-side using AES-256-GCM...");

  const rawKeyBytes = new Uint8Array(32);
  webcrypto.getRandomValues(rawKeyBytes);
  const urlKey = uint8ArrayToBase64Url(rawKeyBytes);

  const encrypted = await encryptSecret(content, rawKeyBytes, passphrase);

  const res = await fetch(`${host}/api/secrets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      salt: encrypted.salt,
      hasPassword: encrypted.hasPassword,
      ttlSeconds,
      maxViews,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.error(`❌ Server error: ${errorData.error || res.statusText}`);
    process.exit(1);
  }

  const data = await res.json();
  const shareUrl = `${host}/secret/${data.id}#k=${urlKey}`;
  const deleteUrl = `${host}/delete/${data.id}?token=${data.deletionToken}`;

  console.log(`
✨ Secret successfully encrypted and uploaded!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 Shareable One-Time Link:
   ${shareUrl}

🔥 Burn Policy:
   Max views: ${maxViews} | Expiry: ${Math.round(ttlSeconds / 60)} minutes

🗑️  Manual Kill Switch Link:
   ${deleteUrl}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Notice: The decryption key after '#k=' was never sent to the server.
  `);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
