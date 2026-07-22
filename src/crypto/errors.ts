/**
 * Typed errors so the UI can show the right message without inspecting strings.
 */

/** The file isn't a valid FENC container (bad magic, truncated, wrong version). */
export class InvalidFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidFileError'
  }
}

/**
 * Decryption failed. Almost always a wrong password or a tampered/corrupted
 * file — AES-GCM refuses to return plaintext if the authentication tag doesn't
 * verify, and we cannot tell those two cases apart (by design).
 */
export class DecryptionError extends Error {
  constructor(message = 'Wrong password or corrupted file.') {
    super(message)
    this.name = 'DecryptionError'
  }
}
