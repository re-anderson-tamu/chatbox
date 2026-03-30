# Plan: Auto-Update + Windows Code Signing for NRI Quercus

## Context

The app was forked from Chatbox and still points to the upstream Chatbox update servers in `src/main/app-updater.ts`. The `electron-builder.yml` publish URL has placeholder values (`YOUR_STORAGE_ACCOUNT`/`YOUR_CONTAINER`). Auto-update is non-functional. Additionally, Windows builds are unsigned (SmartScreen warnings). This plan wires up Azure Blob Storage as the update host, fixes the updater code, enables Windows code signing, and documents the Azure setup steps.

Mac pipeline support is out of scope (separate follow-up).

---

## 1. Azure Storage Setup (manual, outside code)

These are steps you'll need to do in the Azure Portal / CLI:

- **Create a Storage Account** (e.g. `nriquercus`) in your Azure subscription
- **Create a blob container** (e.g. `releases`)
- **Set container access level** to "Blob (anonymous read access for blobs only)" so electron-updater can fetch `latest.yml` without auth
- **Grant the ADO Service Connection** "Storage Blob Data Contributor" on the storage account

## 2. Fix `app-updater.ts` — point to Azure Blob Storage

**File:** `src/main/app-updater.ts`

Replace the hardcoded Chatbox URLs with the generic provider config that electron-builder embeds. When using the `generic` provider, electron-updater automatically reads the embedded `app-update.yml` (baked into the installer at build time by electron-builder) — so we don't need to set feed URLs at all. We just call `checkForUpdatesAndNotify()`.

Changes:
- Remove the `feedUrls` array and the loop over upstream Chatbox servers
- Remove `autoUpdater.setFeedURL(url)` — let electron-updater use the embedded `app-update.yml`
- Keep the beta channel logic (`autoUpdater.channel = 'beta'`)
- Keep the hourly interval and settings check

## 3. Update `electron-builder.yml` — set real publish URL

**File:** `electron-builder.yml` (lines 82-88)

Replace `YOUR_STORAGE_ACCOUNT` and `YOUR_CONTAINER` with actual values. The URL pattern will be:
```
https://<account>.blob.core.windows.net/<container>/${env.UPDATE_CHANNEL}
```
This gets baked into `app-update.yml` inside the installer, so electron-updater knows where to check.

## 4. Enable Windows code signing

**File:** `custom_win_sign.js`

Uncomment the signing implementation that's already templated in the file. The logic:
1. Reads `WIN_CERT_BASE64` and `WIN_CERT_PASSWORD` from environment
2. Decodes the base64 cert to a temp `.pfx` file
3. Calls `signtool sign` with SHA-256
4. Cleans up the temp file
5. Gracefully skips if env vars aren't set (so local dev builds still work unsigned)

## 5. Update ADO pipeline with signing secrets + storage variables

**File:** `azure-pipelines.yml`

Changes:
- Add `WIN_CERT_BASE64` and `WIN_CERT_PASSWORD` as env vars to the Package and Release build steps (sourced from pipeline secret variables)
- Add an `AzureCLI@2` step after the package step to upload artifacts to blob storage
- Update header comments to reflect the new signing setup
- Update the blob storage structure comments to mention signed installers

**Pipeline variables to configure (in ADO UI):**
| Variable | Secret? | Value |
|---|---|---|
| `STORAGE_ACCOUNT_NAME` | No | Your storage account name |
| `CONTAINER_NAME` | No | Your container name |
| `UPDATE_CHANNEL` | No | e.g. `stable` or `beta` |
| `WIN_CERT_BASE64` | Yes | Base64-encoded `.pfx` certificate |
| `WIN_CERT_PASSWORD` | Yes | Certificate password |

**Upload step (AzureCLI@2) — upload order matters:**

Upload the installer files first, then `latest.yml` last. If `latest.yml` lands before the installer is present, any update check that fires mid-upload will try to download a file that doesn't exist yet.

```yaml
- task: AzureCLI@2
  displayName: Upload installers to blob storage
  inputs:
    azureSubscription: your-service-connection
    scriptType: bash
    scriptLocation: inlineScript
    inlineScript: |
      # Upload installer files first
      az storage blob upload-batch \
        --account-name $(STORAGE_ACCOUNT_NAME) \
        --destination $(CONTAINER_NAME)/$(UPDATE_CHANNEL) \
        --source dist/ \
        --pattern "*.exe" \
        --overwrite

      # Upload latest.yml last so it only goes live once the installer is present
      az storage blob upload \
        --account-name $(STORAGE_ACCOUNT_NAME) \
        --container-name $(CONTAINER_NAME) \
        --name $(UPDATE_CHANNEL)/latest.yml \
        --file dist/latest.yml \
        --overwrite
```

## 6. Update `electron-builder.yml` publish URL placeholder

You'll provide the actual storage account name and container name, and I'll update the placeholder values.

---

## Staging: Deployment before auto-update

Getting installers to a public URL is a prerequisite for auto-update but is independently useful (manual installs, sharing with testers). Consider validating this before wiring up the full auto-update flow:

1. Complete steps 1, 3, and 5 (Azure setup, `electron-builder.yml` URL, pipeline upload step) — skip code signing if not ready yet
2. Trigger a pipeline run and confirm the installer and `latest.yml` are reachable at `https://<account>.blob.core.windows.net/<container>/<channel>/`
3. Do a manual install from the blob URL to confirm the file is valid
4. Then proceed with step 2 (fix `app-updater.ts`) and step 4 (code signing) for the full auto-update experience

---

## Files to modify

| File | Change |
|---|---|
| `src/main/app-updater.ts` | Remove Chatbox URLs, use embedded app-update.yml |
| `electron-builder.yml` | Replace placeholder publish URL with real values |
| `custom_win_sign.js` | Enable the signing implementation |
| `azure-pipelines.yml` | Add signing env vars to build steps |

## Verification

1. **Local build test:** `pnpm build && npx electron-builder build --publish never --win` — should produce an unsigned installer (no cert env vars set locally)
2. **Check embedded config:** Unpack the built installer's `resources/app-update.yml` and verify it contains the correct Azure Blob Storage URL
3. **Pipeline test (Package stage):** Push to main, verify the pipeline builds and the artifact is downloadable from ADO
4. **Pipeline test (Release stage):** Push a tag like `v0.0.1-alpha`, verify:
   - Installer is uploaded to `<container>/alpha/`
   - `alpha.yml` manifest is present in blob storage
   - Installer is signed (check with `signtool verify`)
5. **End-to-end auto-update:** Install an older version, then publish a newer tag. The app should detect the update within an hour (or on restart) and show the "Update Available" button
