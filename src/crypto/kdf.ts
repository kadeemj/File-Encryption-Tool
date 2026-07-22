import {
  AES_KEY_LENGTH,
  PBKDF2_HASH,
  PBKDF2_ITERATIONS,
  type Bytes,
} from './constants'

/**
 * Derive a 256-bit AES-GCM key from a password and salt using PBKDF2.
 *
 * The password by itself is low-entropy and fast to guess. PBKDF2 stretches it:
 * it hashes the password `PBKDF2_ITERATIONS` times so that each guess an
 * attacker makes is expensive. The salt ensures two users with the same
 * password get different keys, defeating precomputed lookup tables.
 *
 * @param password  The user's passphrase.
 * @param salt      Random per-file salt (stored in the clear in the container).
 * @returns A non-extractable CryptoKey usable only for AES-GCM encrypt/decrypt.
 */
export async function deriveKey(
  password: string,
  salt: Bytes,
): Promise<CryptoKey> {
  // Import the raw password bytes as key material PBKDF2 can consume.
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false, // not extractable
    ['deriveKey'],
  )

  // Stretch it into an AES-GCM key. `extractable: false` means the raw key
  // bytes can never be read back out of the CryptoKey, even by our own code.
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    passwordKey,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false, // key is not extractable
    ['encrypt', 'decrypt'],
  )
}
