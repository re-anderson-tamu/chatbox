# Plan: Auto-Update + Windows Code Signing for NRI Quercus

## Context

The app was forked from Chatbox and still points to the upstream Chatbox update servers in `src/main/app-updater.ts`. The `electron-builder.yml` publish URL had placeholder values (`YOUR_STORAGE_ACCOUNT`/`YOUR_CONTAINER`) — now filled in. Auto-update is non-functional. Additionally, Windows builds are unsigned (SmartScreen warnings on download in Edge). This plan wires up Azure Blob Storage as the update host, fixes the updater code, enables Windows code signing via **Azure Trusted Signing**, and documents the Azure setup steps.

Mac pipeline support is out of scope (separate follow-up).

---

## 1. Azure Storage Setup (manual, outside code) ✅ DONE

- Storage account: `nriquercus`
- Blob container: `releases`
- Container access level set to "Blob (anonymous read access for blobs only)"
- ADO Service Connection granted "Storage Blob Data Contributor" on the storage account

## 2. Fix `app-updater.ts` — point to Azure Blob Storage ✅ DONE

**File:** `src/main/app-updater.ts`

Removed the Chatbox feed URL loop. `electron-updater` now reads the embedded `app-update.yml` baked into the installer at build time by `electron-builder` (from the `publish.url` in `electron-builder.yml`). No `setFeedURL` call needed.

## 3. Update `electron-builder.yml` — set real publish URL ✅ DONE

**File:** `electron-builder.yml`

Replaced `YOUR_STORAGE_ACCOUNT` / `YOUR_CONTAINER` with `nriquercus` / `releases`. The URL baked into the installer is:
```
https://nriquercus.blob.core.windows.net/releases/${env.UPDATE_CHANNEL}
```

## 4. Set up Azure Artifact Signing (manual, outside code)

**Why Artifact Signing instead of a .pfx cert:**
- AgriLife manages NRI machines via Intune/SCCM — NRI can't push a Group Policy exception
- OV certs still show SmartScreen warnings until the app builds reputation (weeks/months)
- EV certs require a physical USB hardware token, which breaks CI/CD pipelines
- Azure Artifact Signing (formerly "Trusted Signing", GA early 2026) gives EV-level SmartScreen trust, works in pipelines, costs ~$10/month

**Azure Portal steps:**

1. **Install the ADO extension** — search **"Artifact Signing"** (publisher: VisualStudioClient) in the Azure DevOps Marketplace and install it for your organization. This provides the `ArtifactSigning@0` pipeline task.

2. **Register the resource provider** on your subscription (one-time):
   ```
   az provider register --namespace Microsoft.CodeSigning
   ```

3. **Create an Artifact Signing account** in the Azure Portal (same subscription as `nriquercus`):
   - Resource type: search "Artifact Signing"
   - Choose a region (note the endpoint — e.g. East US → `https://eus.codesigning.azure.net`)
   - SKU: Basic is sufficient

4. **Complete Identity Validation** inside the account:
   - Go to the account → "Identity validation" → New
   - Choose **Organization** validation (not Individual)
   - Fill in TAMU/NRI org details; Microsoft verifies the organization (1–7 business days)

5. **Create a Certificate Profile** inside the account:
   - Go to the account → "Certificate profiles" → New
   - Profile type: **Public Trust** (this is what clears SmartScreen)
   - Name it something like `NRIQuercus`

6. **Create an app registration** in Microsoft Entra ID for pipeline signing:
   - Azure Portal → Entra ID → App registrations → New registration
   - Name it something like `nri-quercus-signing`
   - Generate a client secret; note the **Value** (not the Secret ID), tenant ID, and client ID

7. **Grant the app registration the signing role:**
   - Open the Artifact Signing account → Access control (IAM)
   - Add role assignment: **Artifact Signing Certificate Profile Signer**
   - Assign to the `nri-quercus-signing` app registration

## 5. Update ADO pipeline — add `ArtifactSigning@0` signing step ✅ DONE (structure)

**File:** `azure-pipelines.yml`

Changes:
- `custom_win_sign.js` remains a no-op — electron-builder builds unsigned, then the pipeline signs post-build
- Add `ArtifactSigning@0` task after the build step in both Package and Release stages

**Pipeline variables to configure (in ADO UI):**
| Variable | Secret? | Value |
|---|---|---|
| `STORAGE_ACCOUNT_NAME` | No | `nriquercus` |
| `CONTAINER_NAME` | No | `releases` |
| `ARTIFACT_SIGNING_ENDPOINT` | No | e.g. `https://eus.codesigning.azure.net` |
| `ARTIFACT_SIGNING_ACCOUNT` | No | Your Artifact Signing account name |
| `ARTIFACT_SIGNING_PROFILE` | No | Your certificate profile name (e.g. `NRIQuercus`) |
| `ARTIFACT_SIGNING_TENANT_ID` | No | Entra ID tenant ID |
| `ARTIFACT_SIGNING_CLIENT_ID` | No | App registration client ID |
| `ARTIFACT_SIGNING_CLIENT_SECRET` | **Yes** | App registration client secret value |

**Signing task (added after build, before upload):**
```yaml
- task: ArtifactSigning@0
  displayName: Sign installer with Azure Artifact Signing
  inputs:
    AzureTenantID: $(ARTIFACT_SIGNING_TENANT_ID)
    AzureClientID: $(ARTIFACT_SIGNING_CLIENT_ID)
    AzureClientSecret: $(ARTIFACT_SIGNING_CLIENT_SECRET)
    Endpoint: $(ARTIFACT_SIGNING_ENDPOINT)
    ArtifactSigningAccountName: $(ARTIFACT_SIGNING_ACCOUNT)
    CertificateProfileName: $(ARTIFACT_SIGNING_PROFILE)
    FilesFolder: release/build
    FilesFolderFilter: exe
    FilesFolderRecurse: false
    FileDigest: SHA256
    TimestampRfc3161: http://timestamp.acs.microsoft.com
    TimestampDigest: SHA256
```

**Important gotchas:**
- Timestamping is mandatory — without it, the signature expires when the short-lived cert expires (3 days). The `/tr` timestamp makes the signature permanently valid.
- The endpoint must exactly match the region where the account was created (wrong region → cryptic 403 error).
- Assign the RBAC role to the **app registration**, not to your personal account.

**Upload order still matters:** installer + blockmap upload first, then `.yml` manifest last.

## 6. `electron-builder.yml` publish URL ✅ DONE

Real values filled in (see step 3).

---

## Staging: Deployment before auto-update

Getting installers to a public URL is a prerequisite for auto-update but is independently useful (manual installs, sharing with testers). Consider validating in this order:

1. Push to `main` — Package stage should build and produce an ADO artifact (unsigned, no Trusted Signing yet)
2. Download the artifact and confirm it installs correctly
3. Verify the embedded `app-update.yml` inside the installer points to the correct blob URL (see Verification step 2)
4. Push a version tag — Release stage should upload to blob storage; confirm files are reachable at `https://nriquercus.blob.core.windows.net/releases/<channel>/`
5. Complete step 4 (Trusted Signing Azure setup), add the `TrustedSigning@0` task to the pipeline, push another tag — confirm the installer is signed (`signtool verify /pa "NRI Quercus-x.y.z-Setup.exe"`)
6. End-to-end auto-update test (see Verification)

---

## Files to modify

| File | Change | Status |
|---|---|---|
| `src/main/app-updater.ts` | Remove Chatbox URLs, use embedded app-update.yml | ✅ Done |
| `electron-builder.yml` | Replace placeholder publish URL with real values | ✅ Done |
| `custom_win_sign.js` | No-op (signing handled post-build by pipeline) | ✅ Done |
| `azure-pipelines.yml` | Split upload for ordering; add `TrustedSigning@0` task (pending step 4) | Partial |

## Verification

1. **Local build test:** `pnpm build && npx electron-builder build --publish never --win` — produces an unsigned installer
2. **Check embedded config:** Open the built installer with 7-Zip → `$PLUGINSDIR\app-64.7z` → `resources\app-update.yml` — verify the URL is `https://nriquercus.blob.core.windows.net/releases/...`
3. **Pipeline test (Package stage):** Push to main, verify the pipeline builds and the artifact is downloadable from ADO
4. **Pipeline test (Release stage):** Push a tag like `v0.0.1-alpha`, verify:
   - Installer uploaded to `releases/alpha/`
   - `alpha.yml` manifest present in blob storage
   - After Trusted Signing is wired up: installer is signed (`signtool verify /pa "..."`)
5. **End-to-end auto-update:** Install an older version, publish a newer tag, confirm the app detects the update within an hour (or on restart) and shows the "Update Available" button
