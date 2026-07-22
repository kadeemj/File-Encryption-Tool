import type { CryptoResult } from '../crypto'

export type Status = 'idle' | 'working' | 'done' | 'error'

interface ResultPanelProps {
  status: Status
  result: CryptoResult | null
  errorMessage: string
  onDownload: () => void
}

/** Shows progress, the success download, or a friendly error. */
export function ResultPanel({
  status,
  result,
  errorMessage,
  onDownload,
}: ResultPanelProps) {
  if (status === 'working') {
    return (
      <div className="result result--working" data-testid="working">
        <span className="spinner" aria-hidden />
        Working… deriving key and processing your file.
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="result result--error" role="alert" data-testid="error-message">
        {errorMessage}
      </div>
    )
  }

  if (status === 'done' && result) {
    return (
      <div className="result result--done" data-testid="result">
        <div className="result__label">
          Ready: <span data-testid="result-filename">{result.filename}</span>
        </div>
        <button className="btn btn--primary" onClick={onDownload} data-testid="download-button">
          Download
        </button>
      </div>
    )
  }

  return null
}
