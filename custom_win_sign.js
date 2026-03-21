/**
 * Custom Windows code signing hook for electron-builder.
 *
 * electron-builder calls this instead of its built-in signing when `win.sign`
 * is set in electron-builder.yml.
 *
 * To enable real signing:
 *   1. Obtain a code-signing certificate (.pfx or EV token)
 *   2. Store the cert password in a secret env var (e.g. WIN_CERT_PASSWORD)
 *   3. Decode the base64 cert to a temp file and call signtool.exe
 *
 * Example with Azure Key Vault or a .pfx stored as a pipeline secret:
 *
 *   const { execSync } = require('child_process')
 *   const fs = require('fs')
 *   const os = require('os')
 *   const path = require('path')
 *
 *   exports.default = async function(configuration) {
 *     const certBase64 = process.env.WIN_CERT_BASE64
 *     const certPassword = process.env.WIN_CERT_PASSWORD
 *     if (!certBase64 || !certPassword) return  // skip if not configured
 *
 *     const certPath = path.join(os.tmpdir(), 'cert.pfx')
 *     fs.writeFileSync(certPath, Buffer.from(certBase64, 'base64'))
 *
 *     execSync(
 *       `signtool sign /fd sha256 /p "${certPassword}" /f "${certPath}" "${configuration.path}"`,
 *       { stdio: 'inherit' }
 *     )
 *
 *     fs.unlinkSync(certPath)
 *   }
 */

/**
 * No-op signing: builds unsigned installers.
 * Set WIN_CERT_BASE64 and WIN_CERT_PASSWORD env vars (and uncomment the block
 * above) to enable real signing.
 */
exports.default = async function (configuration) {
  // Unsigned build — no certificate configured.
  // Users will see a SmartScreen warning on first run until the app has
  // enough reputation, or until a certificate is added.
}
