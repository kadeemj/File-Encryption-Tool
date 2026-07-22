import {
  ENCRYPTED_EXTENSION,
  IV_LENGTH,
  MAX_FILE_SIZE,
  SALT_LENGTH,
} from './constants'
import { pack, packPayload, unpack, unpackPayload } from './container'
import { DecryptionError, InvalidFileError } from './errors'
import { sanitizeFilename } from './filename'
import { deriveKey } from './kdf'

function assertFileSize(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new InvalidFileError(
      `File is too large. Maximum size is ${Math.floor(MAX_FILE_SIZE / (1024 * 1024))} MB.`,
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
  assertFileSize(file)
  const data = new Uint8Array(await file.arrayBuffer())
  const payload = packPayload({ filename: file.name, data })

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const key = await deriveKey(password, salt)

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload),
  )

  const container = pack({ salt, iv, ciphertext })
  return {
    blob: new Blob([container], { type: 'application/octet-stream' }),
    filename: file.name + ENCRYPTED_EXTENSION,
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
  assertFileSize(file)
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
