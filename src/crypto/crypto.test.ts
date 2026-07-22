import { describe, expect, it } from 'vitest'
import { decryptFile, encryptFile } from './cipher'
import {
  ENCRYPTED_EXTENSION,
  FALLBACK_FILENAME,
  HEADER_LENGTH,
} from './constants'
import { unpack } from './container'
import { DecryptionError, InvalidFileError } from './errors'
import { sanitizeFilename } from './filename'
import { isPasswordAcceptable } from './password'

/** Build a File from bytes, as the browser would hand us from an <input>. */
function makeFile(bytes: Uint8Array, name: string): File {
  return new File([bytes as BlobPart], name, {
    type: 'application/octet-stream',
  })
}

/** Read a Blob back into bytes for comparison. */
async function bytesOf(blob: Blob): Promise<Uint8Array> {
  return new Uint8Array(await blob.arrayBuffer())
}

const SAMPLE = new Uint8Array([0, 1, 2, 3, 250, 251, 252, 253, 254, 255, 42])
const PASSWORD = 'correct horse battery staple'

describe('encryptFile / decryptFile', () => {
  it('round-trips: decrypting an encrypted file returns the original bytes', async () => {
    const original = makeFile(SAMPLE, 'secret.bin')

    const encrypted = await encryptFile(original, PASSWORD)
    const encFile = makeFile(await bytesOf(encrypted.blob), encrypted.filename)
    const decrypted = await decryptFile(encFile, PASSWORD)

    expect(await bytesOf(decrypted.blob)).toEqual(SAMPLE)
  })

  it('preserves and restores the original filename', async () => {
    const original = makeFile(SAMPLE, 'my report.pdf')

    const encrypted = await encryptFile(original, PASSWORD)
    expect(encrypted.filename).toBe('my report.pdf' + ENCRYPTED_EXTENSION)

    const encFile = makeFile(await bytesOf(encrypted.blob), encrypted.filename)
    const decrypted = await decryptFile(encFile, PASSWORD)
    expect(decrypted.filename).toBe('my report.pdf')
  })

  it('sanitizes unsafe filenames on decrypt', async () => {
    const original = makeFile(SAMPLE, '../../evil\nname.txt')
    const encrypted = await encryptFile(original, PASSWORD)
    const encFile = makeFile(await bytesOf(encrypted.blob), encrypted.filename)
    const decrypted = await decryptFile(encFile, PASSWORD)
    expect(decrypted.filename).toBe('evilname.txt')
  })

  it('produces different ciphertext each time (random salt + IV)', async () => {
    const original = makeFile(SAMPLE, 'secret.bin')
    const a = await bytesOf((await encryptFile(original, PASSWORD)).blob)
    const b = await bytesOf((await encryptFile(original, PASSWORD)).blob)
    expect(a).not.toEqual(b)
  })

  it('fails with DecryptionError on the wrong password', async () => {
    const original = makeFile(SAMPLE, 'secret.bin')
    const encrypted = await encryptFile(original, PASSWORD)
    const encFile = makeFile(await bytesOf(encrypted.blob), encrypted.filename)

    await expect(decryptFile(encFile, 'wrong password')).rejects.toBeInstanceOf(
      DecryptionError,
    )
  })

  it('fails with DecryptionError when the ciphertext is tampered with', async () => {
    const original = makeFile(SAMPLE, 'secret.bin')
    const encrypted = await encryptFile(original, PASSWORD)
    const tampered = await bytesOf(encrypted.blob)

    // Flip a bit in the last byte (inside the ciphertext / GCM tag region).
    tampered[tampered.length - 1] ^= 0x01
    const tamperedFile = makeFile(tampered, encrypted.filename)

    await expect(decryptFile(tamperedFile, PASSWORD)).rejects.toBeInstanceOf(
      DecryptionError,
    )
  })

  it('rejects a file that is not a FENC container', async () => {
    const notEncrypted = makeFile(
      new TextEncoder().encode('hello, i am plain text'),
      'notes.txt',
    )
    await expect(decryptFile(notEncrypted, PASSWORD)).rejects.toBeInstanceOf(
      InvalidFileError,
    )
  })

  it('rejects truncated ciphertext before attempting decryption', async () => {
    const original = makeFile(SAMPLE, 'secret.bin')
    const encrypted = await encryptFile(original, PASSWORD)
    const bytes = await bytesOf(encrypted.blob)
    // Header + 8 bytes of ciphertext — shorter than the 16-byte GCM tag.
    const truncated = bytes.slice(0, HEADER_LENGTH + 8)

    expect(() => unpack(truncated)).toThrow(InvalidFileError)
    await expect(
      decryptFile(makeFile(truncated, encrypted.filename), PASSWORD),
    ).rejects.toBeInstanceOf(InvalidFileError)
  })

  it('round-trips passwords that differ only by Unicode composition', async () => {
    const nfc = 'caf\u00e9' // é as a single code point
    const nfd = 'cafe\u0301' // e + combining acute
    expect(nfc).not.toBe(nfd)
    expect(nfc.normalize('NFC')).toBe(nfd.normalize('NFC'))

    const original = makeFile(SAMPLE, 'accent.bin')
    const encrypted = await encryptFile(original, nfc)
    const encFile = makeFile(await bytesOf(encrypted.blob), encrypted.filename)
    const decrypted = await decryptFile(encFile, nfd)
    expect(await bytesOf(decrypted.blob)).toEqual(SAMPLE)
  })

  it('round-trips an empty file', async () => {
    const original = makeFile(new Uint8Array(0), 'empty.dat')
    const encrypted = await encryptFile(original, PASSWORD)
    const encFile = makeFile(await bytesOf(encrypted.blob), encrypted.filename)
    const decrypted = await decryptFile(encFile, PASSWORD)

    expect((await bytesOf(decrypted.blob)).length).toBe(0)
    expect(decrypted.filename).toBe('empty.dat')
  })
})

describe('sanitizeFilename', () => {
  it('strips path components and control characters', () => {
    expect(sanitizeFilename('../../foo/bar.txt')).toBe('bar.txt')
    expect(sanitizeFilename('hi\u0000there')).toBe('hithere')
  })

  it('falls back for empty or dot-only names', () => {
    expect(sanitizeFilename('')).toBe(FALLBACK_FILENAME)
    expect(sanitizeFilename('...')).toBe(FALLBACK_FILENAME)
    expect(sanitizeFilename('.')).toBe(FALLBACK_FILENAME)
  })

  it('prefixes reserved Windows device names', () => {
    expect(sanitizeFilename('CON')).toBe('file_CON')
    expect(sanitizeFilename('nul.txt')).toBe('file_nul.txt')
  })
})

describe('isPasswordAcceptable', () => {
  it('requires at least 12 non-whitespace-only characters', () => {
    expect(isPasswordAcceptable('')).toBe(false)
    expect(isPasswordAcceptable('short')).toBe(false)
    expect(isPasswordAcceptable('            ')).toBe(false)
    expect(isPasswordAcceptable('twelve chars')).toBe(true)
  })
})
