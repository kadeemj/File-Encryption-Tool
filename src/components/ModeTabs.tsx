export type Mode = 'encrypt' | 'decrypt'

interface ModeTabsProps {
  mode: Mode
  onChange: (mode: Mode) => void
  disabled?: boolean
}

/** Two-way toggle between Encrypt and Decrypt. */
export function ModeTabs({ mode, onChange, disabled }: ModeTabsProps) {
  return (
    <div className="tabs" role="tablist" aria-label="Operation">
      <button
        role="tab"
        aria-selected={mode === 'encrypt'}
        className={mode === 'encrypt' ? 'tab tab--active' : 'tab'}
        onClick={() => onChange('encrypt')}
        disabled={disabled}
        data-testid="mode-encrypt"
      >
        Encrypt
      </button>
      <button
        role="tab"
        aria-selected={mode === 'decrypt'}
        className={mode === 'decrypt' ? 'tab tab--active' : 'tab'}
        onClick={() => onChange('decrypt')}
        disabled={disabled}
        data-testid="mode-decrypt"
      >
        Decrypt
      </button>
    </div>
  )
}
