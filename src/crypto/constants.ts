/**
 * Cryptographic parameters and container-format constants.
 *
 * These values are baked into the encrypted file. Changing any of them is a
 * format change: bump `FORMAT_VERSION` and teach `unpack` how to read the old
 * version so previously-encrypted files still decrypt.
 */

/**
 * Byte buffers we hand to Web Crypto must be backed by a plain ArrayBuffer
 * (never a SharedArrayBuffer, which another thread could mutate mid-operation).
 * Using this alias consistently keeps the types honest without `as` casts.
 */
export type Bytes = Uint8Array<ArrayBuffer>

/** Magic bytes at the start of every encrypted file: the ASCII string "FENC". */
export const MAGIC = new Uint8Array([0x46, 0x45, 0x4e, 0x43]) // "FENC"

/** Current container format version (single byte). */
export const FORMAT_VERSION = 1

/**
 * PBKDF2 iteration count. 600k is the OWASP-recommended minimum for
 * PBKDF2-HMAC-SHA-256 (as of 2023). Higher = slower to brute-force but also
 * slower for the legitimate user; this is a deliberate balance.
 */
export const PBKDF2_ITERATIONS = 600_000

/** Hash used inside PBKDF2. */
export const PBKDF2_HASH = 'SHA-256'

/** AES key length in bits. */
export const AES_KEY_LENGTH = 256

/** Salt length in bytes. Random per file; makes precomputed (rainbow) tables useless. */
export const SALT_LENGTH = 16

/**
 * AES-GCM IV/nonce length in bytes. 12 bytes (96 bits) is the value AES-GCM is
 * optimised for and what the spec recommends. Random per encryption; a reused
 * (key, IV) pair catastrophically breaks GCM, so we never reuse one.
 */
export const IV_LENGTH = 12

/** Fixed-size header before the ciphertext: magic + version + salt + iv. */
export const HEADER_LENGTH = MAGIC.length + 1 + SALT_LENGTH + IV_LENGTH

/** Extension appended to encrypted files. */
export const ENCRYPTED_EXTENSION = '.enc'

/**
 * AES-GCM authentication tag length in bytes. Ciphertext shorter than this
 * cannot be valid — reject before paying the PBKDF2 cost.
 */
export const GCM_TAG_LENGTH = 16

/** Soft cap on in-memory encrypt/decrypt. Larger files risk freezing the tab. */
export const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MiB

/** Minimum password length enforced when choosing a new password (encrypt). */
export const MIN_PASSWORD_LENGTH = 12

/** Fallback download name when a decrypted filename is empty or unsafe. */
export const FALLBACK_FILENAME = 'decrypted.bin'

/** Max length for a sanitized download filename (common filesystem limit). */
export const MAX_FILENAME_LENGTH = 255
