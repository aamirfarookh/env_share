import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface StoredSecret {
  id: string;
  ciphertext: string;
  iv: string;
  salt?: string;
  hasPassword: boolean;
  maxViews: number;
  viewCount: number;
  expiresAt: number;
  deletionToken: string;
  createdAt: number;
}

export interface SecretMetadata {
  id: string;
  exists: boolean;
  expiresAt?: number;
  remainingViews?: number;
  maxViews?: number;
  hasPassword?: boolean;
  createdAt?: number;
}

// In-Memory map with optional local file persistence for hot-reload resilience
class StorageEngine {
  private memoryStore: Map<string, StoredSecret> = new Map();
  private dataFilePath: string;
  private isInitialized = false;

  constructor() {
    const dataDir = path.join(process.cwd(), ".data");
    this.dataFilePath = path.join(dataDir, "secrets.json");
    this.init();
  }

  private init() {
    if (this.isInitialized) return;
    try {
      const dataDir = path.dirname(this.dataFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(this.dataFilePath)) {
        const raw = fs.readFileSync(this.dataFilePath, "utf8");
        const parsed: Record<string, StoredSecret> = JSON.parse(raw);
        const now = Date.now();
        for (const [id, secret] of Object.entries(parsed)) {
          if (secret.expiresAt > now && secret.viewCount < secret.maxViews) {
            this.memoryStore.set(id, secret);
          }
        }
      }
    } catch {
      // Fallback cleanly to in-memory if disk access is restricted
    }
    this.isInitialized = true;
  }

  private persist() {
    try {
      this.purgeExpired();
      const obj: Record<string, StoredSecret> = {};
      for (const [id, secret] of this.memoryStore.entries()) {
        obj[id] = secret;
      }
      fs.writeFileSync(this.dataFilePath, JSON.stringify(obj), "utf8");
    } catch {
      // In-memory continues to operate seamlessly
    }
  }

  private purgeExpired() {
    const now = Date.now();
    for (const [id, secret] of this.memoryStore.entries()) {
      if (secret.expiresAt <= now || secret.viewCount >= secret.maxViews) {
        this.memoryStore.delete(id);
      }
    }
  }

  /**
   * Saves a new encrypted secret with TTL and maximum view limit.
   */
  async saveSecret(params: {
    ciphertext: string;
    iv: string;
    salt?: string;
    hasPassword: boolean;
    ttlSeconds: number;
    maxViews: number;
  }): Promise<{ id: string; deletionToken: string; expiresAt: number }> {
    this.purgeExpired();

    const id = crypto.randomUUID();
    const deletionToken = crypto.randomBytes(24).toString("hex");
    const now = Date.now();
    const expiresAt = now + params.ttlSeconds * 1000;

    const secret: StoredSecret = {
      id,
      ciphertext: params.ciphertext,
      iv: params.iv,
      salt: params.salt,
      hasPassword: params.hasPassword,
      maxViews: params.maxViews,
      viewCount: 0,
      expiresAt,
      deletionToken,
      createdAt: now,
    };

    this.memoryStore.set(id, secret);
    this.persist();

    return { id, deletionToken, expiresAt };
  }

  /**
   * Non-destructive inspection of secret metadata (safe from bot preview burning).
   */
  async getSecretMeta(id: string): Promise<SecretMetadata> {
    this.purgeExpired();
    const secret = this.memoryStore.get(id);

    if (!secret) {
      return { id, exists: false };
    }

    if (secret.expiresAt <= Date.now() || secret.viewCount >= secret.maxViews) {
      this.memoryStore.delete(id);
      this.persist();
      return { id, exists: false };
    }

    return {
      id,
      exists: true,
      expiresAt: secret.expiresAt,
      remainingViews: secret.maxViews - secret.viewCount,
      maxViews: secret.maxViews,
      hasPassword: secret.hasPassword,
      createdAt: secret.createdAt,
    };
  }

  /**
   * Atomic reveal operation: increments view count, returns ciphertext payload.
   * If the secret has reached maxViews, it is permanently purged immediately.
   */
  async revealSecret(id: string): Promise<{
    ciphertext: string;
    iv: string;
    salt?: string;
    hasPassword: boolean;
    remainingViews: number;
  } | null> {
    this.purgeExpired();
    const secret = this.memoryStore.get(id);

    if (!secret) {
      return null;
    }

    if (secret.expiresAt <= Date.now() || secret.viewCount >= secret.maxViews) {
      this.memoryStore.delete(id);
      this.persist();
      return null;
    }

    // Atomically increment view count
    secret.viewCount += 1;
    const remainingViews = secret.maxViews - secret.viewCount;

    // If no views remain, burn it from storage right now!
    if (remainingViews <= 0) {
      this.memoryStore.delete(id);
    }

    this.persist();

    return {
      ciphertext: secret.ciphertext,
      iv: secret.iv,
      salt: secret.salt,
      hasPassword: secret.hasPassword,
      remainingViews: Math.max(0, remainingViews),
    };
  }

  /**
   * Manual kill switch (burner link) - deletes the secret immediately.
   */
  async deleteSecret(id: string, deletionToken: string): Promise<boolean> {
    this.purgeExpired();
    const secret = this.memoryStore.get(id);

    if (!secret) {
      return false;
    }

    if (secret.deletionToken !== deletionToken) {
      return false;
    }

    this.memoryStore.delete(id);
    this.persist();
    return true;
  }
}

// Global singleton instance
const globalStorage = globalThis as unknown as { __envshareStorage?: StorageEngine };

export const storage: StorageEngine =
  globalStorage.__envshareStorage ?? new StorageEngine();

if (process.env.NODE_ENV !== "production") {
  globalStorage.__envshareStorage = storage;
}
