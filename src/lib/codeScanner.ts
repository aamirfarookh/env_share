export interface CodeOccurrence {
  file: string;
  line: number;
  snippet: string;
}

export interface DetectedVariable {
  key: string;
  occurrences: CodeOccurrence[];
}

export interface CodeAuditResult {
  detectedVariables: DetectedVariable[];
  totalCodeReferences: number;
  undeclaredKeys: string[];  // In code, but NOT in env (CRASH HAZARD)
  unusedKeys: string[];      // In env, but NOT in code (DEAD CONFIG)
  coveredKeys: string[];     // In both code and env (HEALTHY)
}

const REGEX_PATTERNS = [
  // JS/TS: process.env.KEY
  /process\.env\.([A-Z0-9_]+)/g,
  // JS/TS: process.env['KEY'] or process.env["KEY"]
  /process\.env\[['"]([A-Z0-9_]+)['"]\]/g,
  // Vite / ESM: import.meta.env.KEY
  /import\.meta\.env\.([A-Z0-9_]+)/g,
  // Vite / ESM: import.meta.env['KEY']
  /import\.meta\.env\[['"]([A-Z0-9_]+)['"]\]/g,
  // Python: os.environ.get('KEY') or os.getenv('KEY')
  /os\.(?:environ\.get|getenv)\(['"]([A-Z0-9_]+)['"]/g,
  // Python: os.environ['KEY'] or os.environ["KEY"]
  /os\.environ\[['"]([A-Z0-9_]+)['"]\]/g,
  // Go: os.Getenv("KEY")
  /os\.Getenv\(['"]([A-Z0-9_]+)['"]\)/g,
];

// Common built-in environment variables to ignore
const SYSTEM_IGNORES = new Set([
  "NODE_ENV",
  "PORT",
  "HOST",
  "PWD",
  "PATH",
  "HOME",
  "USER",
  "SHELL",
  "CI",
]);

/**
 * Scans a code string and identifies all referenced environment variables with line numbers.
 */
export function scanCodeString(
  code: string,
  fileName = "snippet.ts"
): DetectedVariable[] {
  const lines = code.split(/\r?\n/);
  const keyMap = new Map<string, CodeOccurrence[]>();

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    const lineNumber = i + 1;

    for (const pattern of REGEX_PATTERNS) {
      // Reset regex state for global search
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(lineText)) !== null) {
        const key = match[1];
        if (SYSTEM_IGNORES.has(key)) continue;

        if (!keyMap.has(key)) {
          keyMap.set(key, []);
        }

        keyMap.get(key)!.push({
          file: fileName,
          line: lineNumber,
          snippet: lineText.trim(),
        });
      }
    }
  }

  const result: DetectedVariable[] = [];
  for (const [key, occurrences] of keyMap.entries()) {
    result.push({ key, occurrences });
  }

  return result.sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Performs a comprehensive audit comparing detected code variables against declared .env keys.
 */
export function auditCodeAgainstEnv(
  detectedVariables: DetectedVariable[],
  declaredEnvKeys: string[]
): CodeAuditResult {
  const envKeySet = new Set(declaredEnvKeys);
  const codeKeySet = new Set(detectedVariables.map((v) => v.key));

  let totalReferences = 0;
  for (const v of detectedVariables) {
    totalReferences += v.occurrences.length;
  }

  const undeclaredKeys: string[] = [];
  const coveredKeys: string[] = [];

  for (const codeKey of codeKeySet) {
    if (!envKeySet.has(codeKey)) {
      undeclaredKeys.push(codeKey);
    } else {
      coveredKeys.push(codeKey);
    }
  }

  const unusedKeys: string[] = [];
  for (const envKey of envKeySet) {
    if (!codeKeySet.has(envKey)) {
      unusedKeys.push(envKey);
    }
  }

  return {
    detectedVariables,
    totalCodeReferences: totalReferences,
    undeclaredKeys: undeclaredKeys.sort(),
    unusedKeys: unusedKeys.sort(),
    coveredKeys: coveredKeys.sort(),
  };
}
