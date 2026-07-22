import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const NAME = 'secret.txt'
const PASSWORD = 'correct horse battery staple'
// Include a non-ASCII char to prove byte-accurate round-tripping.
const ORIGINAL = Buffer.from('Top secret: the launch code is 0000. 🚀', 'utf8')

/** Upload a file, enter a password, run the current mode, return the download path. */
async function runOperation(
  page: Page,
  file: { name: string; buffer: Buffer },
  password: string,
  opts: { confirm?: boolean } = {},
): Promise<string> {
  await page.getByTestId('file-input').setInputFiles({
    name: file.name,
    mimeType: 'application/octet-stream',
    buffer: file.buffer,
  })
  await page.getByTestId('password-input').fill(password)
  if (opts.confirm !== false) {
    const confirm = page.getByTestId('password-confirm-input')
    if (await confirm.count()) {
      await confirm.fill(password)
    }
  }
  await page.getByTestId('submit-button').click()

  await expect(page.getByTestId('result')).toBeVisible()
  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('download-button').click()
  const download = await downloadPromise
  const path = await download.path()
  return path
}

test('encrypts a file and decrypts it back to the original bytes', async ({
  page,
}) => {
  await page.goto('/')

  // Encrypt (default mode).
  await expect(page.getByTestId('mode-encrypt')).toHaveAttribute(
    'aria-selected',
    'true',
  )
  const encPath = await runOperation(page, { name: NAME, buffer: ORIGINAL }, PASSWORD)
  await expect(page.getByTestId('result-filename')).toHaveText(NAME + '.enc')

  // Decrypt the just-produced file with the same password.
  await page.getByTestId('mode-decrypt').click()
  const encBuffer = await readFile(encPath)
  const decPath = await runOperation(
    page,
    { name: NAME + '.enc', buffer: encBuffer },
    PASSWORD,
  )

  // The original filename is restored, and the bytes match exactly.
  await expect(page.getByTestId('result-filename')).toHaveText(NAME)
  const recovered = await readFile(decPath)
  expect(recovered.equals(ORIGINAL)).toBe(true)
})

test('shows a friendly error when the password is wrong', async ({ page }) => {
  await page.goto('/')

  const encPath = await runOperation(page, { name: NAME, buffer: ORIGINAL }, PASSWORD)
  const encBuffer = await readFile(encPath)

  await page.getByTestId('mode-decrypt').click()
  await page.getByTestId('file-input').setInputFiles({
    name: NAME + '.enc',
    mimeType: 'application/octet-stream',
    buffer: encBuffer,
  })
  await page.getByTestId('password-input').fill('the wrong password')
  await page.getByTestId('submit-button').click()

  const error = page.getByTestId('error-message')
  await expect(error).toBeVisible()
  await expect(error).toContainText('Wrong password or corrupted file')
})
