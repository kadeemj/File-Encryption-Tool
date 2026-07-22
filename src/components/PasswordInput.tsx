import { useState } from 'react'
import { MIN_PASSWORD_LENGTH } from '../crypto'

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** Show a rough strength meter (only meaningful when choosing a new password). */
  showStrength?: boolean
  /** When set, show a second field and require an exact match before submit. */
  confirmValue?: string
  onConfirmChange?: (value: string) => void
}

interface Strength {
  label: string
  /** 0–4 */
  score: number
}

/**
 * A deliberately simple, transparent strength heuristic (length + character
 * variety). It is a nudge, not a security guarantee — real strength depends on
 * unpredictability, which no client-side meter can truly measure.
 */
function estimateStrength(password: string): Strength {
  if (!password) return { label: '', score: 0 }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 14) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']
  return { label: labels[score], score }
}

/** Password field with a show/hide toggle and optional strength meter. */
export function PasswordInput({
  value,
  onChange,
  disabled,
  showStrength,
  confirmValue,
  onConfirmChange,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const strength = showStrength ? estimateStrength(value) : null
  const requireConfirm = confirmValue !== undefined && onConfirmChange !== undefined
  const tooShort =
    showStrength && value.length > 0 && value.length < MIN_PASSWORD_LENGTH
  const whitespaceOnly = showStrength && value.length > 0 && value.trim().length === 0
  const mismatch =
    requireConfirm && confirmValue.length > 0 && value !== confirmValue

  return (
    <div className="password">
      <div className="password__row">
        <input
          type={visible ? 'text' : 'password'}
          className="password__input"
          placeholder="Password"
          value={value}
          disabled={disabled}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          data-testid="password-input"
        />
        <button
          type="button"
          className="password__toggle"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? 'Hide password' : 'Show password'}
          data-testid="toggle-password"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>

      {requireConfirm && (
        <div className="password__row">
          <input
            type={visible ? 'text' : 'password'}
            className="password__input"
            placeholder="Confirm password"
            value={confirmValue}
            disabled={disabled}
            autoComplete="off"
            onChange={(e) => onConfirmChange(e.target.value)}
            data-testid="password-confirm-input"
          />
        </div>
      )}

      {tooShort && (
        <small className="password__hint" data-testid="password-too-short">
          Password must be at least {MIN_PASSWORD_LENGTH} characters.
        </small>
      )}
      {whitespaceOnly && (
        <small className="password__hint" data-testid="password-whitespace">
          Password cannot be only whitespace.
        </small>
      )}
      {mismatch && (
        <small className="password__hint" data-testid="password-mismatch">
          Passwords do not match.
        </small>
      )}

      {strength && value && (
        <div className="password__strength" data-testid="password-strength">
          <div className={`meter meter--${strength.score}`}>
            <span style={{ width: `${(strength.score / 4) * 100}%` }} />
          </div>
          <small>{strength.label}</small>
        </div>
      )}
    </div>
  )
}
