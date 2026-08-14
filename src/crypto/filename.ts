import { FALLBACK_FILENAME, MAX_FILENAME_LENGTH } from "./constants";

function isUnsafeCodePoint(codePoint: number): boolean {
  return (
    codePoint <= 0x1f ||
    codePoint === 0x7f ||
    codePoint === 0x2028 ||
    codePoint === 0x2029 ||
    (codePoint >= 0x202a && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069)
  );
}

function stripUnsafeCharacters(value: string): string {
  return Array.from(value)
    .filter((character) => !isUnsafeCodePoint(character.codePointAt(0)!))
    .join("");
}

/**
 * Make a decrypted filename safe to offer as a download / show in the UI.
 *
 * The name comes from authenticated plaintext, but a shared encrypted file can
 * still embed path traversal, control characters, or reserved OS names.
 */
export function sanitizeFilename(name: string): string {
  // Strip C0 controls, DEL, line/paragraph separators, and Unicode bidi /
  // isolate overrides FIRST. If we stripped path components first, a control
  // char before a path separator (e.g. "evil\n../../x") would defeat the
  // basename extraction below, because `.` in a regex does not cross \n.
  // Control characters must be removed before basename parsing.
  let base = stripUnsafeCharacters(name);

  // Basename only — drop any directory components. `[\s\S]` (not `.`) so the
  // extraction stays robust even if a future edit removes a char from the
  // strip range above.
  base = base.replace(/^[\s\S]*[/\\]/, "");

  // Trim leading/trailing dots and whitespace (Windows-hostile).
  base = base.replace(/^[.\s]+|[.\s]+$/g, "");

  if (!base || base === "." || base === "..") {
    return FALLBACK_FILENAME;
  }

  // Avoid reserved Windows device names (CON, PRN, AUX, NUL, COM1…, LPT1…).
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(base)) {
    base = `file_${base}`;
  }

  if (base.length > MAX_FILENAME_LENGTH) {
    base = base.slice(0, MAX_FILENAME_LENGTH);
  }

  return base || FALLBACK_FILENAME;
}
