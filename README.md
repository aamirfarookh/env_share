# 🔒 EnvShare & EnvAudit — Developer Secrets Suite

A lightweight, zero-overhead developer security suite for fast-moving startups and engineering teams. Contains two integrated tools:
1. **EnvShare**: Zero-Knowledge End-to-End Encrypted (E2EE) secret and `.env` sharing with self-destruct timers and bot-safe reveal gates.
2. **EnvAudit & Sync**: Multi-environment secrets drift detector (`Local` vs. `Staging` vs. `Production`) and codebase AST scanner to stop Friday deployment crashes before they happen.

---

## 🚀 Key Features

### 1. 🔒 EnvShare (Zero-Knowledge Secret Sharing)
- **Client-Side AES-256-GCM**: Plaintext is encrypted inside the browser using the native Web Crypto API before touching the network.
- **The URL Fragment (`#`) Guarantee**: The 256-bit encryption key lives exclusively after the `#k=...` fragment. Per RFC 3986, hash fragments are **never sent to the server in HTTP request headers**.
- **Bot-Safe Reveal Gate**: Slack, Discord, Twitter, and Teams preview crawlers only receive safe metadata without triggering "Burn-After-Reading" prematurely.
- **Masked Developer Viewer**: Secrets are obscured (`••••••••`) by default to prevent shoulder surfing in coffee shops or over Zoom screen shares.
- **Sender Kill Switch**: Incinerate secrets on-demand with a private deletion token.
- **CLI Companion**: `cat .env | node bin/cli.mjs`

### 2. 📊 EnvAudit & Drift Guard (Matrix & Codebase Scanner)
- **Side-by-Side Multi-Env Matrix**: Compare `Local (.env.local)`, `Staging (.env.staging)`, `Production (.env.production)`, and `Template (.env.example)` side-by-side.
- **Deployment Crash Detection**: Instantly flags variables defined in staging/local but **missing in production**.
- **Suspicious Placeholder Warnings**: Catches unconfigured placeholders (`localhost`, `change_me`, `todo`, empty values) in production.
- **Codebase AST Scanner**: Statically searches your repository for `process.env.*`, `import.meta.env.*`, `os.environ.get(*)`, and flags:
  - 🚨 **Undeclared Keys**: Referenced in code but missing from all environment files (Fatal crash hazard).
  - ⚠️ **Dead Keys**: Declared in `.env` but nowhere in code (Dead config bloat).
- **1-Click Remediation**: Copy missing keys template for target environments or export directly into **EnvShare** for E2EE delivery.
- **CI/CD Gatekeeper**: Run `node bin/audit-cli.mjs check --example .env.example --src ./src` in GitHub Actions to block PRs with undeclared environment variables.

---

## 🏗️ Quickstart

### 1. Start Development Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) for **EnvShare** or [http://localhost:3000/audit](http://localhost:3000/audit) for **EnvAudit**.

### 2. Production Build
```bash
npm run build
npm run start
```

---

## 💻 CLI Tools

### EnvShare CLI
```bash
# Share a local file
node bin/cli.mjs .env

# Pipe from standard input
cat .env | node bin/cli.mjs --views 1 --ttl 3600
```

### EnvAudit CLI & CI/CD Runner
```bash
# 1. Compare multiple environments side-by-side
node bin/audit-cli.mjs diff .env.local .env.staging .env.production

# 2. CI/CD Gatekeeper (exits 1 if code uses undeclared env variables)
node bin/audit-cli.mjs check --example .env.example --src ./src
```

---

## 🧪 Testing

```bash
# 1. Cryptographic self-tests
npm run test:crypto

# 2. End-to-end integration test suite
node --experimental-strip-types test_integration.mjs

# 3. EnvAudit drift matrix & AST scanner tests
node --experimental-strip-types test_audit.mjs
```
