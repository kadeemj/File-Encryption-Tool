# 🔒 File Vault

[!\[CI\](https://github.com/kadeemj/File-Encryption-Tool/actions/workflows/ci.yml/badge.svg)](https://github.com/kadeemj/File-Encryption-Tool/actions/workflows/ci.yml)
[!\[Deploy\](https://github.com/kadeemj/File-Encryption-Tool/actions/workflows/deploy.yml/badge.svg)](https://github.com/kadeemj/File-Encryption-Tool/actions/workflows/deploy.yml)

**Live app:** <https://kadeemj.github.io/File-Encryption-Tool/>

A **client-side** file encryption / decryption web app. Everything happens in
your browser using the native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) —
your files and password **never leave your device** and there is no backend.

## How it works

1. You pick a file and enter a password.
2. The password is stretched into a 256-bit AES key with **PBKDF2-HMAC-SHA-256**
   (1,000,000 iterations + a random per-file salt).
3. The file is encrypted with **AES-256-GCM**, an *authenticated* cipher that
   also detects tampering and wrong passwords.
4. You download the encrypted `.enc` file. Its outer name is opaque. To decrypt,
   upload it and supply the same password.

### Encrypted file format

Outer container (on disk):

```javascript
[ magic "FENC" (4) ][ version (1) ][ salt (16) ][ iv (12) ][ ciphertext + GCM tag ]
```

Inner payload (encrypted, so never visible on disk):

```javascript
[ name length (uint16 LE) ][ filename (UTF-8) ][ file bytes ]
```

The salt and IV are not secret and are stored in the clear (they must be, to
re-derive the key). The **original filename is hidden inside** the encrypted
payload, so it's only revealed after a successful decryption. The encrypted
download is named `encrypted-<salt-hex>.enc`, which leaks nothing — the salt is
already in the header in the clear.

## Security notes

- **No password recovery.** If you lose the password, the file is unrecoverable
  by design — there is no backdoor.
- **Wrong password and a corrupted file look identical.** AES-GCM cannot tell
  them apart, so both surface as "Wrong password or corrupted file."
- **Never hand-rolled crypto.** Only `crypto.subtle` and
  `crypto.getRandomValues` are used.
- Derived keys are created non-extractable — the raw key bytes can never be read
  back out, even by this app's own code.
- Passwords are NFC-normalized before key derivation so equivalent Unicode
  compositions unlock the same file.
- **Decrypted filenames are sanitized before download.** The name is
  authenticated, but a shared encrypted file can still carry path traversal,
  control characters, Unicode bidi overrides, or reserved Windows device names
  (`CON`, `NUL`, `COM1`…). All of those are stripped or defused.
- Each encryption draws a fresh random salt and IV, so encrypting the same file
  twice produces unrelated ciphertext.
- Truncated files are rejected before key derivation, so junk input cannot make
  you pay the full 1,000,000-iteration PBKDF2 cost.

## Project structure

- `src/crypto/` — framework-agnostic crypto module (no React). This is the
  security-critical core and is unit-tested in isolation.
- `src/components/` — React UI (dropzone, mode tabs, password input, results).
- `src/App.tsx` — wiring only.
- `e2e/` — Playwright end-to-end roundtrip tests.

Built with React 19, TypeScript, and Vite. No runtime dependencies beyond React.

## Scripts

```bash
npm install          # install dependencies
npm run dev          # start the dev server (http://localhost:5173)
npm run build        # type-check and build for production
npm run lint         # lint (oxlint)
npm run test         # crypto unit tests (Vitest)
npm run test:watch   # unit tests in watch mode
npm run test:e2e     # end-to-end tests (Playwright)
npm run preview      # serve the production build locally
```

CI runs lint, unit tests, build, then the Playwright suite on every push and
pull request. `main` deploys to GitHub Pages.

## Limitations (v1)

- Files are encrypted whole in memory. The UI rejects files over **100 MiB**;
  multi-GB files would need chunked/streaming encryption (a future enhancement —
  the format's version byte leaves room for it).
- Encrypt requires a password of at least **16 characters**, plus a matching
  confirmation field. Both modes limit input to 1,024 normalized UTF-8 bytes so
  browser work stays bounded.
- **The PBKDF2 iteration count is baked into the build, not into the file.**
  There is no stored parameter to migrate against, so a build that changes
  `PBKDF2_ITERATIONS` cannot decrypt files produced by an older one. Changing it
  is a breaking format change.
- Decrypt still accepts passwords shorter than 16 characters, so files encrypted
  under an earlier, looser policy keep working.

## Verifying the "your files never leave your browser" claim

Open your browser's DevTools → Network tab and encrypt a file. You'll see **no
network request** carrying the file — all work happens locally.
