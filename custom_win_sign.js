/**
 * Custom Windows code signing hook for electron-builder.
 *
 * electron-builder calls this instead of its built-in signing when `win.sign`
 * is set in electron-builder.yml.
 *
 * Signing is handled post-build by the Azure Trusted Signing pipeline task
 * (TrustedSigning@0), so this hook is intentionally a no-op. The pipeline
 * signs the built .exe after electron-builder finishes.
 */
exports.default = async function (configuration) {
  // Signing is done post-build by TrustedSigning@0 in azure-pipelines.yml.
}
