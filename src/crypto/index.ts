// Public surface of the framework-agnostic crypto module.
export { encryptFile, decryptFile } from './cipher'
export type { CryptoResult } from './cipher'
export {
  InvalidFileError,
  DecryptionError,
  PasswordPolicyError,
} from './errors'
export {
  ENCRYPTED_EXTENSION,
  MAX_CONTAINER_SIZE,
  MAX_FILE_SIZE,
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
} from './constants'
export { sanitizeFilename } from './filename'
export { isPasswordAcceptable, passwordByteLength } from './password'
