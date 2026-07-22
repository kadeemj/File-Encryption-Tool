import { FALLBACK_FILENAME, MAX_FILENAME_LENGTH } from './constants'

/**
 * Make a decrypted filename safe to offer as a download / show in the UI.
 *
 * The name comes from authenticated plaintext, but a shared encrypted file can
 * still embed path traversal, control characters, or reserved OS names.
 */
export function sanitizeFilename(name: string): string {
  // Basename only — drop any directory components.
  let base = name.replace(/^.*[/\\]/, '')

  // Strip C0 controls, DEL, and Unicode bidi / isolate overrides.
  base = base.replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '')

  // Trim leading/trailing dots and whitespace (Windows-hostile).
  base = base.replace(/^[.\s]+|[.\s]+$/g, '')

  if (!base || base === '.' || base === '..') {
    return FALLBACK_FILENAME
  }

  // Avoid reserved Windows device names (CON, PRN, AUX, NUL, COM1…, LPT1…).
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(base)) {
    base = `file_${base}`
  }

  if (base.length > MAX_FILENAME_LENGTH) {
    base = base.slice(0, MAX_FILENAME_LENGTH)
  }

  return base || FALLBACK_FILENAME
}
