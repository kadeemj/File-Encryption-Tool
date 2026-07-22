import { MIN_PASSWORD_LENGTH } from './constants'

/**
 * Whether a password is acceptable for encrypting a new file.
 * Decrypt accepts any non-empty string so legacy short passwords still work.
 */
export function isPasswordAcceptable(password: string): boolean {
  return (
    password.length >= MIN_PASSWORD_LENGTH && password.trim().length > 0
  )
}
