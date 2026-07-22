// Public surface of the framework-agnostic crypto module.
export { encryptFile, decryptFile } from './cipher'
export type { CryptoResult } from './cipher'
export { InvalidFileError, DecryptionError } from './errors'
export { ENCRYPTED_EXTENSION } from './constants'
