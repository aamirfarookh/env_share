/**
 * Zero-Knowledge Cryptography Module for EnvShare.
 * Uses Web Crypto API (SubtleCrypto) which is natively supported in modern browsers
 * and Node.js (19+).
 * 
 * Cryptographic specs:
 * - Cipher: AES-256-GCM (Authenticated Encryption with Associated Data)
 * - IV: 96-bit (12 bytes) cryptographically secure random values
 * - Key: 256-bit random key transported strictly in the URL fragment (#k=...)
 * - Optional Passphrase: Derived via PBKDF2 (SHA-256, 100,000 iterations, 16-byte salt)
 */

export interface EncryptedPayload {
  ciphertext: string; // Base64URL encoded AES-GCM ciphertext + auth tag
  iv: string;         // Base64URL encoded 96-bit IV
  salt?: string;      // Base64URL encoded 16-byte salt (if passphrase enabled)
  hasPassword: boolean;
}

/**
 * Base64URL conversion helpers (RFC 4648 § 5)
 */
export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === "function" 
    ? btoa(binary) 
    : Buffer.from(binary, "binary").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlToUint8Array(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = typeof atob === "function"
    ? atob(base64)
    : Buffer.from(base64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a cryptographically secure 256-bit random key for AES-GCM.
 * Returned as a 32-byte Uint8Array.
 */
export function generateRandomKey(): Uint8Array {
  const keyBytes = new Uint8Array(32);
  const cryptoObj = typeof window !== "undefined" ? window.crypto : globalThis.crypto;
  cryptoObj.getRandomValues(keyBytes);
  return keyBytes;
}

/**
 * Exports raw key bytes to a URL-safe Base64 string.
 */
export function exportKeyToUrlSafe(keyBytes: Uint8Array): string {
  return uint8ArrayToBase64Url(keyBytes);
}

/**
 * Imports URL-safe Base64 string into raw key bytes.
 */
export function importKeyFromUrlSafe(urlSafeString: string): Uint8Array {
  return base64UrlToUint8Array(urlSafeString);
}

/**
 * Derives an AES-GCM CryptoKey using PBKDF2 if a passphrase is provided,
 * combining both the random URL key and the user passphrase.
 */
async function deriveCryptoKey(
  rawKeyBytes: Uint8Array,
  passphrase?: string,
  saltBytes?: Uint8Array
): Promise<CryptoKey> {
  const cryptoObj = typeof window !== "undefined" ? window.crypto : globalThis.crypto;
  const subtle = cryptoObj.subtle;

  if (!passphrase) {
    // Direct import of 256-bit raw key for AES-GCM
    return subtle.importKey(
      "raw",
      rawKeyBytes as BufferSource,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  if (!saltBytes) {
    throw new Error("Salt is required when deriving key from passphrase");
  }

  // Combine URL key bytes and passphrase into a composite secret:
  // composite = rawKeyBytes + UTF8(passphrase)
  const passBytes = new TextEncoder().encode(passphrase);
  const composite = new Uint8Array(rawKeyBytes.length + passBytes.length);
  composite.set(rawKeyBytes, 0);
  composite.set(passBytes, rawKeyBytes.length);

  // Import composite secret as PBKDF2 base key
  const baseKey = await subtle.importKey(
    "raw",
    composite as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  // Derive final 256-bit AES-GCM key
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes as BufferSource,
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts plaintext string using AES-256-GCM.
 * The rawKeyBytes will be placed in the URL fragment by the caller.
 */
export async function encryptSecret(
  plaintext: string,
  rawKeyBytes: Uint8Array,
  passphrase?: string
): Promise<EncryptedPayload> {
  const cryptoObj = typeof window !== "undefined" ? window.crypto : globalThis.crypto;
  const subtle = cryptoObj.subtle;

  // 12-byte (96-bit) IV is standard for AES-GCM
  const iv = new Uint8Array(12);
  cryptoObj.getRandomValues(iv);

  let salt: Uint8Array | undefined;
  if (passphrase && passphrase.trim().length > 0) {
    salt = new Uint8Array(16);
    cryptoObj.getRandomValues(salt);
  }

  const cryptoKey = await deriveCryptoKey(rawKeyBytes, passphrase?.trim(), salt);
  const encodedData = new TextEncoder().encode(plaintext);

  const encryptedBuffer = await subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv as BufferSource,
    },
    cryptoKey,
    encodedData as BufferSource
  );

  return {
    ciphertext: uint8ArrayToBase64Url(new Uint8Array(encryptedBuffer)),
    iv: uint8ArrayToBase64Url(iv),
    salt: salt ? uint8ArrayToBase64Url(salt) : undefined,
    hasPassword: Boolean(passphrase && passphrase.trim().length > 0),
  };
}

/**
 * Decrypts AES-256-GCM ciphertext payload back into plaintext string.
 */
export async function decryptSecret(
  payload: { ciphertext: string; iv: string; salt?: string },
  rawKeyBytes: Uint8Array,
  passphrase?: string
): Promise<string> {
  const cryptoObj = typeof window !== "undefined" ? window.crypto : globalThis.crypto;
  const subtle = cryptoObj.subtle;

  const ciphertextBytes = base64UrlToUint8Array(payload.ciphertext);
  const ivBytes = base64UrlToUint8Array(payload.iv);
  const saltBytes = payload.salt ? base64UrlToUint8Array(payload.salt) : undefined;

  const cryptoKey = await deriveCryptoKey(rawKeyBytes, passphrase?.trim(), saltBytes);

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes as BufferSource,
      },
      cryptoKey,
      ciphertextBytes as BufferSource
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    throw new Error(
      "Decryption failed. The secret may have been tampered with or the decryption key / password is incorrect."
    );
  }
}
