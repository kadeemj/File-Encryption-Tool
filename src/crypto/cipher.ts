import {
  ENCRYPTED_EXTENSION,
  IV_LENGTH,
  MAX_CONTAINER_SIZE,
  MAX_FILE_SIZE,
  MAX_PASSWORD_BYTES,
  SALT_LENGTH,
} from './constants'
import { pack, packPayload, unpack, unpackPayload } from './container'
import {
  DecryptionError,
  InvalidFileError,
  PasswordPolicyError,
} from './errors'
import { sanitizeFilename } from './filename'
import { deriveKey } from './kdf'
import { isPasswordAcceptable, passwordByteLength } from './password'

function assertFileSize(file: File, maxSize: number): void {
  if (file.size > maxSize) {
    throw new InvalidFileError(
      `File is too large. Maximum size is ${Math.floor(maxSize / (1024 * 1024))} MB.`,
    )
  }
}

function assertPasswordSize(password: string): void {
  if (passwordByteLength(password) > MAX_PASSWORD_BYTES) {
    throw new PasswordPolicyError(
      `Password is too long. Maximum size is ${MAX_PASSWORD_BYTES} UTF-8 bytes.`,
    )
  }
}

/** The result of an encrypt or decrypt operation, ready to hand to the user. */
export interface CryptoResult {
  /** The output bytes wrapped as a Blob for downloading. */
  blob: Blob
  /** Suggested download filename. */
  filename: string
}

/**
 * Encrypt a file with a password.
 *
 * Every call generates a fresh random salt and IV, so encrypting the same file
 * twice produces different ciphertext — an attacker can't even tell two outputs
 * came from the same input.
 */
export async function encryptFile(
  file: File,
  password: string,
): Promise<CryptoResult> {
  assertFileSize(file, MAX_FILE_SIZE)
  assertPasswordSize(password)
  if (!isPasswordAcceptable(password)) {
    throw new PasswordPolicyError(
      'Password is too short or contains only whitespace.',
    )
  }
  const data = new Uint8Array(await file.arrayBuffer())
  const payload = packPayload({ filename: file.name, data })

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(password, salt)

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload),
  )

  const container = pack({ salt, iv, ciphertext })
  const opaqueName = Array.from(salt, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return {
    blob: new Blob([container], { type: 'application/octet-stream' }),
    filename: `encrypted-${opaqueName}${ENCRYPTED_EXTENSION}`,
  }
}

/**
 * Decrypt a file previously produced by {@link encryptFile}.
 *
 * Throws {@link InvalidFileError} if the file isn't a recognised container, or
 * {@link DecryptionError} if the password is wrong or the data was tampered
 * with — AES-GCM's authentication tag makes these two cases indistinguishable.
 */
export async function decryptFile(
  file: File,
  password: string,
): Promise<CryptoResult> {
  assertFileSize(file, MAX_CONTAINER_SIZE)
  assertPasswordSize(password)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { salt, iv, ciphertext } = unpack(bytes) // throws InvalidFileError

  const key = await deriveKey(password, salt)

  let plaintext: ArrayBuffer
  try {
    plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext,
    )
  } catch {
    // GCM tag verification failed: wrong password or corrupted/tampered file.
    throw new DecryptionError()
  }

  const payload = unpackPayload(new Uint8Array(plaintext))
  return {
    blob: new Blob([payload.data], { type: 'application/octet-stream' }),
    filename: sanitizeFilename(payload.filename),
  }
}
