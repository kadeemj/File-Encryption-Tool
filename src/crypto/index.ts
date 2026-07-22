// Public surface of the framework-agnostic crypto module.
export { encryptFile, decryptFile } from './cipher'
export type { CryptoResult } from './cipher'
export { InvalidFileError, DecryptionError } from './errors'
export {
  ENCRYPTED_EXTENSION,
  MAX_FILE_SIZE,
  MIN_PASSWORD_LENGTH,
} from './constants'
export { sanitizeFilename } from './filename'
export { isPasswordAcceptable } from './password'
