/**
 * Robust .env file parser, validator, and formatter.
 */

export interface EnvPair {
  type: "pair";
  key: string;
  value: string;
  comment?: string;
  raw: string;
  lineNumber: number;
  warning?: string;
}

export interface EnvComment {
  type: "comment";
  text: string;
  raw: string;
  lineNumber: number;
}

export interface EnvEmpty {
  type: "empty";
  raw: string;
  lineNumber: number;
}

export type EnvLine = EnvPair | EnvComment | EnvEmpty;

export interface EnvParseResult {
  lines: EnvLine[];
  pairs: EnvPair[];
  warnings: { line: number; message: string }[];
  duplicateKeys: string[];
}

/**
 * Parses raw .env string into structured representations.
 */
export function parseEnv(rawText: string): EnvParseResult {
  const rawLines = rawText.split(/\r?\n/);
  const lines: EnvLine[] = [];
  const pairs: EnvPair[] = [];
  const warnings: { line: number; message: string }[] = [];
  const seenKeys = new Map<string, number>();
  const duplicateKeys: string[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    const lineNumber = i + 1;
    const trimmed = raw.trim();

    if (trimmed.length === 0) {
      lines.push({ type: "empty", raw, lineNumber });
      continue;
    }

    if (trimmed.startsWith("#")) {
      lines.push({
        type: "comment",
        text: trimmed.slice(1).trim(),
        raw,
        lineNumber,
      });
      continue;
    }

    // Check for "export KEY=VALUE"
    let content = trimmed;
    if (content.startsWith("export ")) {
      content = content.replace(/^export\s+/, "");
    }

    const equalIndex = content.indexOf("=");
    if (equalIndex === -1) {
      // Invalid format or orphaned line
      warnings.push({
        line: lineNumber,
        message: `Line does not contain an '=' assignment.`,
      });
      lines.push({
        type: "comment",
        text: `[Malformed line]: ${trimmed}`,
        raw,
        lineNumber,
      });
      continue;
    }

    const rawKey = content.slice(0, equalIndex);
    const rawVal = content.slice(equalIndex + 1);

    const key = rawKey.trim();
    let value = rawVal.trim();
    let inlineComment: string | undefined;

    // Detect warning if there are spaces around '='
    if (rawKey.endsWith(" ") || rawVal.startsWith(" ")) {
      warnings.push({
        line: lineNumber,
        message: `Spaces around '=' in '${key}' may cause parsing failures in shell scripts.`,
      });
    }

    // Check for quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      // Check for unquoted inline comment (e.g. KEY=val # comment)
      const commentIdx = value.indexOf(" #");
      if (commentIdx !== -1) {
        inlineComment = value.slice(commentIdx + 2).trim();
        value = value.slice(0, commentIdx).trim();
      }
    }

    // Check duplicates
    if (seenKeys.has(key)) {
      duplicateKeys.push(key);
      warnings.push({
        line: lineNumber,
        message: `Duplicate key '${key}' was previously defined on line ${seenKeys.get(key)}.`,
      });
    } else {
      seenKeys.set(key, lineNumber);
    }

    const pair: EnvPair = {
      type: "pair",
      key,
      value,
      comment: inlineComment,
      raw,
      lineNumber,
    };

    lines.push(pair);
    pairs.push(pair);
  }

  return {
    lines,
    pairs,
    warnings,
    duplicateKeys,
  };
}

/**
 * Generates an example .env file template (.env.example)
 * Keeps all comments and keys, but blanks out or placeholders values.
 */
export function generateEnvExample(rawText: string, placeholder = ""): string {
  const result = parseEnv(rawText);
  return result.lines
    .map((item) => {
      if (item.type === "empty") return "";
      if (item.type === "comment") return item.raw;
      const commentSuffix = item.comment ? ` # ${item.comment}` : "";
      return `${item.key}=${placeholder}${commentSuffix}`;
    })
    .join("\n");
}

/**
 * Re-serializes parsed pairs into clean .env format.
 */
export function formatEnvPairs(pairs: { key: string; value: string }[]): string {
  return pairs
    .map(({ key, value }) => {
      // If value contains spaces, quotes, or newlines, quote it
      if (/[\s#"']/.test(value) || value.includes("\n")) {
        const escaped = value.replace(/"/g, '\\"');
        return `${key}="${escaped}"`;
      }
      return `${key}=${value}`;
    })
    .join("\n");
}
