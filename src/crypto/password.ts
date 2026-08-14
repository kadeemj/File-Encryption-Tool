import { MAX_PASSWORD_BYTES, MIN_PASSWORD_LENGTH } from './constants'

/** Return the normalized UTF-8 size used by the KDF. */
export function passwordByteLength(password: string): number {
  return new TextEncoder().encode(password.normalize('NFC')).byteLength
}

/**
 * Whether a password is acceptable for encrypting a new file.
 * Decrypt accepts legacy short passwords, but both modes have a byte limit.
 */
export function isPasswordAcceptable(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH &&
    password.trim().length > 0 &&
    passwordByteLength(password) <= MAX_PASSWORD_BYTES
  )
}
