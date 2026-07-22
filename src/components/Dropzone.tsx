import { useRef, useState } from 'react'
import { MAX_FILE_SIZE } from '../crypto'

interface DropzoneProps {
  file: File | null
  onFile: (file: File) => void
  /** Called when a chosen file is rejected (e.g. over the size limit). */
  onReject?: (message: string) => void
  disabled?: boolean
  /** Max accepted size in bytes. Defaults to {@link MAX_FILE_SIZE}. */
  maxSize?: number
}

/** Format a byte count as a human-readable size. */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(1)} ${units[unit]}`
}

/** Drag-and-drop file picker that also supports click-to-browse. */
export function Dropzone({
  file,
  onFile,
  onReject,
  disabled,
  maxSize = MAX_FILE_SIZE,
}: DropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function accept(candidate: File) {
    if (candidate.size > maxSize) {
      onReject?.(
        `File is too large. Maximum size is ${Math.floor(maxSize / (1024 * 1024))} MB.`,
      )
      return
    }
    onFile(candidate)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) accept(dropped)
  }

  return (
    <div
      className={
        'dropzone' +
        (dragging ? ' dropzone--active' : '') +
        (disabled ? ' dropzone--disabled' : '')
      }
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      data-testid="dropzone"
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        disabled={disabled}
        onChange={(e) => {
          const chosen = e.target.files?.[0]
          if (chosen) accept(chosen)
          // Reset so choosing the same file again still fires onChange.
          e.target.value = ''
        }}
        data-testid="file-input"
      />
      {file ? (
        <div className="dropzone__file">
          <span className="dropzone__name" data-testid="selected-file">
            {file.name}
          </span>
          <span className="dropzone__size">{formatSize(file.size)}</span>
        </div>
      ) : (
        <div className="dropzone__prompt">
          <strong>Drop a file here</strong>
          <span>or click to browse</span>
          <span className="dropzone__limit">
            Max {Math.floor(maxSize / (1024 * 1024))} MB
          </span>
        </div>
      )}
    </div>
  )
}
