import {
  FORMAT_VERSION,
  HEADER_LENGTH,
  IV_LENGTH,
  MAGIC,
  SALT_LENGTH,
  type Bytes,
} from './constants'
import { InvalidFileError } from './errors'

/** The parsed pieces of an encrypted file's header plus its ciphertext. */
export interface Container {
  salt: Bytes
  iv: Bytes
  ciphertext: Bytes
}

/** The decrypted payload: the original filename plus the original file bytes. */
export interface Payload {
  filename: string
  data: Bytes
}

/**
 * Serialise an encrypted file: [ MAGIC | version | salt | iv | ciphertext ].
 *
 * The salt and IV are NOT secret — they must travel with the ciphertext so the
 * key can be re-derived and decryption can run. Their secrecy is not what makes
 * the scheme safe; the password is.
 */
export function pack({ salt, iv, ciphertext }: Container): Bytes {
  if (salt.length !== SALT_LENGTH) {
    throw new InvalidFileError(`salt must be ${SALT_LENGTH} bytes`)
  }
  if (iv.length !== IV_LENGTH) {
    throw new InvalidFileError(`iv must be ${IV_LENGTH} bytes`)
  }

  const out = new Uint8Array(HEADER_LENGTH + ciphertext.length)
  let offset = 0
  out.set(MAGIC, offset)
  offset += MAGIC.length
  out[offset] = FORMAT_VERSION
  offset += 1
  out.set(salt, offset)
  offset += SALT_LENGTH
  out.set(iv, offset)
  offset += IV_LENGTH
  out.set(ciphertext, offset)
  return out
}

/**
 * Parse and validate an encrypted file's bytes. Throws {@link InvalidFileError}
 * if the input isn't a FENC container we understand.
 */
export function unpack(bytes: Bytes): Container {
  if (bytes.length < HEADER_LENGTH) {
    throw new InvalidFileError('File is too small to be a valid encrypted file.')
  }

  // Verify magic bytes.
  for (let i = 0; i < MAGIC.length; i++) {
    if (bytes[i] !== MAGIC[i]) {
      throw new InvalidFileError('This does not look like an encrypted file.')
    }
  }

  const version = bytes[MAGIC.length]
  if (version !== FORMAT_VERSION) {
    throw new InvalidFileError(`Unsupported file version: ${version}.`)
  }

  let offset = MAGIC.length + 1
  const salt = bytes.slice(offset, offset + SALT_LENGTH)
  offset += SALT_LENGTH
  const iv = bytes.slice(offset, offset + IV_LENGTH)
  offset += IV_LENGTH
  const ciphertext = bytes.slice(offset)

  return { salt, iv, ciphertext }
}

/**
 * Build the plaintext we actually encrypt: the original filename prefixed to
 * the file bytes. Encrypting the name too means it stays hidden until someone
 * supplies the correct password.
 *
 * Layout: [ nameLength (uint16 LE) | filename (UTF-8) | file bytes ].
 */
export function packPayload({ filename, data }: Payload): Bytes {
  const nameBytes = new TextEncoder().encode(filename)
  if (nameBytes.length > 0xffff) {
    throw new InvalidFileError('Filename is too long to store.')
  }

  const out = new Uint8Array(2 + nameBytes.length + data.length)
  const view = new DataView(out.buffer)
  view.setUint16(0, nameBytes.length, true /* little-endian */)
  out.set(nameBytes, 2)
  out.set(data, 2 + nameBytes.length)
  return out
}

/** Reverse of {@link packPayload}: split decrypted bytes back into name + data. */
export function unpackPayload(bytes: Bytes): Payload {
  if (bytes.length < 2) {
    throw new InvalidFileError('Decrypted data is malformed.')
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const nameLength = view.getUint16(0, true)
  if (bytes.length < 2 + nameLength) {
    throw new InvalidFileError('Decrypted data is malformed.')
  }
  const filename = new TextDecoder().decode(bytes.subarray(2, 2 + nameLength))
  const data = bytes.slice(2 + nameLength)
  return { filename, data }
}
