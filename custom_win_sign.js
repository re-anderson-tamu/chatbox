/**
 * Custom Windows code signing hook for electron-builder.
 *
 * electron-builder calls this instead of its built-in signing when `win.sign`
 * is set in electron-builder.yml.
 *
 * Reads WIN_CERT_BASE64 and WIN_CERT_PASSWORD from environment.
 * If either is absent (e.g. local dev builds), signing is skipped silently.
 *
 * Pipeline setup:
 *   1. Obtain a code-signing certificate (.pfx)
 *   2. Base64-encode it: certutil -encode cert.pfx cert.b64 (Windows)
 *      or: base64 -w 0 cert.pfx (Linux/macOS)
 *   3. Store the base64 string as a secret pipeline variable WIN_CERT_BASE64
 *   4. Store the certificate password as WIN_CERT_PASSWORD
 */

const { execSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

exports.default = async function (configuration) {
  const certBase64 = process.env.WIN_CERT_BASE64
  const certPassword = process.env.WIN_CERT_PASSWORD
  if (!certBase64 || !certPassword) {
    // No certificate configured — produces an unsigned build.
    // Users will see a SmartScreen warning on first run.
    return
  }

  const certPath = path.join(os.tmpdir(), `cert-${process.pid}.pfx`)
  try {
    fs.writeFileSync(certPath, Buffer.from(certBase64, 'base64'))
    execSync(
      `signtool sign /fd sha256 /p "${certPassword}" /f "${certPath}" "${configuration.path}"`,
      { stdio: 'inherit' }
    )
  } finally {
    if (fs.existsSync(certPath)) fs.unlinkSync(certPath)
  }
}
