# 🔒 File Vault

A **client-side** file encryption / decryption web app. Everything happens in
your browser using the native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) —
your files and password **never leave your device** and there is no backend.

## How it works

1. You pick a file and enter a password.
2. The password is stretched into a 256-bit AES key with **PBKDF2-HMAC-SHA-256**
   (600,000 iterations + a random per-file salt).
3. The file is encrypted with **AES-256-GCM**, an *authenticated* cipher that
   also detects tampering and wrong passwords.
4. You download the encrypted `.enc` file. To decrypt, upload it and supply the
   same password.

### Encrypted file format

```
[ magic "FENC" (4) ][ version (1) ][ salt (16) ][ iv (12) ][ ciphertext + GCM tag ]
```

The salt and IV are not secret and are stored in the clear (they must be, to
re-derive the key). The **original filename is hidden inside** the encrypted
payload, so it's only revealed after a successful decryption.

## Security notes

- **No password recovery.** If you lose the password, the file is unrecoverable
  by design — there is no backdoor.
- **Wrong password and a corrupted file look identical.** AES-GCM cannot tell
  them apart, so both surface as "Wrong password or corrupted file."
- **Never hand-rolled crypto.** Only `crypto.subtle` and
  `crypto.getRandomValues` are used.
- Derived keys are created non-extractable — the raw key bytes can never be read
  back out, even by this app's own code.

## Project structure

- `src/crypto/` — framework-agnostic crypto module (no React). This is the
  security-critical core and is unit-tested in isolation.
- `src/components/` — React UI (dropzone, mode tabs, password input, results).
- `src/App.tsx` — wiring only.
- `e2e/` — Playwright end-to-end round-trip tests.

## Scripts

```bash
npm install          # install dependencies
npm run dev          # start the dev server (http://localhost:5173)
npm run build        # type-check and build for production
npm run test         # crypto unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
```

## Limitations (v1)

- Files are encrypted whole in memory. Comfortable up to ~100MB; multi-GB files
  would need chunked/streaming encryption (a future enhancement — the format's
  version byte leaves room for it).

## Verifying the "your files never leave your browser" claim

Open your browser's DevTools → Network tab and encrypt a file. You'll see **no
network request** carrying the file — all work happens locally.
