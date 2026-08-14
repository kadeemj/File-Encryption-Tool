import { useRef, useState } from 'react'
import './App.css'
import { Dropzone } from './components/Dropzone'
import { ModeTabs, type Mode } from './components/ModeTabs'
import { PasswordInput } from './components/PasswordInput'
import { ResultPanel, type Status } from './components/ResultPanel'
import {
  decryptFile,
  DecryptionError,
  encryptFile,
  InvalidFileError,
  isPasswordAcceptable,
  PasswordPolicyError,
  MAX_CONTAINER_SIZE,
  MAX_FILE_SIZE,
  type CryptoResult,
} from './crypto'

function isCryptoAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    typeof crypto !== 'undefined' &&
    !!crypto.subtle
  )
}

export default function App() {
  const [mode, setMode] = useState<Mode>('encrypt')
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<CryptoResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [cryptoOk] = useState(isCryptoAvailable)
  // Synchronous lock — React state alone can miss a double-click before re-render.
  const inFlight = useRef(false)

  /** Any input change invalidates a previous result/error. */
  function reset() {
    setStatus('idle')
    setResult(null)
    setErrorMessage('')
  }

  async function handleSubmit() {
    if (!file || !password || inFlight.current || status === 'working') return
    if (mode === 'encrypt') {
      if (!isPasswordAcceptable(password) || password !== confirmPassword) return
    }
    inFlight.current = true
    reset()
    setStatus('working')
    try {
      const op = mode === 'encrypt' ? encryptFile : decryptFile
      const output = await op(file, password)
      setResult(output)
      setStatus('done')
    } catch (err) {
      // Known, user-facing errors carry a safe message; anything else is generic.
      const message =
        err instanceof DecryptionError ||
        err instanceof InvalidFileError ||
        err instanceof PasswordPolicyError
          ? err.message
          : 'Something went wrong while processing the file.'
      setErrorMessage(message)
      setStatus('error')
    } finally {
      setPassword('')
      setConfirmPassword('')
      inFlight.current = false
    }
  }

  function handleDownload() {
    if (!result) return
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setResult(null)
    setFile(null)
    setStatus('idle')
  }

  const busy = status === 'working'
  const passwordOk =
    mode === 'encrypt'
      ? isPasswordAcceptable(password) && password === confirmPassword
      : password.length > 0
  const canSubmit = Boolean(file) && passwordOk && !busy && cryptoOk

  return (
    <main className="app">
      <header className="app__header">
        <h1>🔒 File Vault</h1>
        <p className="app__tagline">
          Encrypt &amp; decrypt files in your browser. Your files and password
          never leave this device.
        </p>
      </header>

      {!cryptoOk && (
        <div className="banner banner--error" role="alert" data-testid="secure-context-warning">
          Web Crypto is unavailable. Open this app over HTTPS or on localhost —
          encryption cannot run in an insecure context.
        </div>
      )}

      <section className="card">
        <ModeTabs
          mode={mode}
          onChange={(m) => {
            setMode(m)
            setPassword('')
            setConfirmPassword('')
            reset()
          }}
          disabled={busy || !cryptoOk}
        />

        <Dropzone
          file={file}
          maxSize={mode === 'encrypt' ? MAX_FILE_SIZE : MAX_CONTAINER_SIZE}
          onFile={(f) => {
            setFile(f)
            reset()
          }}
          onReject={(msg) => {
            setFile(null)
            setResult(null)
            setErrorMessage(msg)
            setStatus('error')
          }}
          disabled={busy || !cryptoOk}
        />

        <PasswordInput
          value={password}
          onChange={(p) => {
            setPassword(p)
            reset()
          }}
          confirmValue={mode === 'encrypt' ? confirmPassword : undefined}
          onConfirmChange={
            mode === 'encrypt'
              ? (p) => {
                  setConfirmPassword(p)
                  reset()
                }
              : undefined
          }
          disabled={busy || !cryptoOk}
          showStrength={mode === 'encrypt'}
        />

        <button
          className="btn btn--primary btn--block"
          onClick={handleSubmit}
          disabled={!canSubmit}
          data-testid="submit-button"
        >
          {mode === 'encrypt' ? 'Encrypt file' : 'Decrypt file'}
        </button>

        <ResultPanel
          status={status}
          result={result}
          errorMessage={errorMessage}
          onDownload={handleDownload}
        />
      </section>

      <footer className="app__footer">
        <p>
          AES-GCM 256-bit · PBKDF2-SHA-256 · Web Crypto API. There is no password
          recovery — if you lose the password, the file cannot be decrypted.
        </p>
      </footer>
    </main>
  )
}
