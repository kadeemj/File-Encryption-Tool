import { useState } from 'react'

interface PasswordInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** Show a rough strength meter (only meaningful when choosing a new password). */
  showStrength?: boolean
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
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)
  const strength = showStrength ? estimateStrength(value) : null

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
