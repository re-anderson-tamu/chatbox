# NRI OAK Fork Manifest

Tracks all changes made to this fork of [chatboxai/chatbox](https://github.com/chatboxai/chatbox) so they aren't lost during upstream merges.

**Fork point:** `1577f1e` (upstream commit `chore: regenerate pnpm-lock.yaml for open repo`)
**Total divergence:** 19 commits, 51 files changed, +824 / -482 lines

---

## 1. Branding (Chatbox → NRI OAK)

These changes rename the app and apply NRI visual identity. Upstream will likely touch many of these same files, so **expect conflicts** on merge.

| File | What changed |
|---|---|
| `electron-builder.yml` | `productName` → `NRI OAK`; publish target switched from S3/Cloudflare to Azure Blob (generic provider) |
| `src/main/main.ts` | Tray icon → `icon-32x32.png`; tooltip → `OAK` |
| `src/main/menu.ts` | macOS menu labels → `OAK` |
| `src/renderer/Sidebar.tsx` | Logo link → `nri.tamu.edu`; app name → `OAK` |
| `src/renderer/index.ejs` | `<title>` → `OAK`; reformatted HTML (whitespace-only diffs in SVG/script blocks) |
| `src/renderer/index.html` | Same as above |
| `src/renderer/routes/index.tsx` | Homepage greeting → `"What can I help you dig into?"` |
| `src/renderer/routes/settings/route.tsx` | Settings nav label → `NRI OAK AI` |
| `src/renderer/routes/settings/provider/chatbox-ai/-components/LoginView.tsx` | Welcome text → `Welcome to NRI OAK`; removed license-key switch link |
| `src/renderer/modals/Welcome.tsx` | Title → `OAK`; tagline → `AI with deep roots`; bullet points replaced; default setup navigates to Agrilife provider; removed "Setup later" button; added link to `chat.ag.tamus.ai` |
| `src/renderer/components/icons/HomepageIcon.tsx` | Replaced inline SVG chat-bubble icon with `<img>` of NRI logo |
| `src/renderer/static/globals.css` | Brand color `#228be6` (blue) → `#83cc70` (green) in both light and dark themes |

### Replaced assets (binary files — always keep ours)

| File | Description |
|---|---|
| `assets/icon.png` | App icon |
| `assets/icon-32x32.png` | **New** — Windows tray icon |
| `resources/icon-background.png` | NRI-branded background |
| `resources/icon-background.psd` | **New** — source PSD |
| `resources/icon-foreground.png` | NRI-branded foreground |
| `resources/icon-only.png` | NRI-branded icon |
| `resources/splash.png` | NRI splash screen |
| `resources/splash-dark.png` | NRI splash (dark mode) |
| `resources/splash.psd` | **New** — source PSD |
| `src/renderer/favicon.ico` | NRI favicon |
| `src/renderer/static/icon.png` | NRI icon (renderer copy) |

---

## 2. Agrilife Provider (new feature)

Added a custom AI model provider for the TAMUS AgriLife Chat API.

| File | Status | What changed |
|---|---|---|
| `src/shared/types/provider.ts` | Modified | Added `Agrilife` to `ModelProviderEnum` |
| `src/shared/models/index.ts` | Modified | Added `Agrilife` → `'Agrilife API'` mapping |
| `src/shared/providers/definitions/agrilife.ts` | **New** | Provider definition (endpoint, auth, config) |
| `src/shared/providers/definitions/models/agrilife.ts` | **New** | Model list for Agrilife |
| `src/renderer/static/icons/providers/agrilife.png` | **New** | Provider icon |
| `src/renderer/static/icons/providers/agrilife.psd` | **New** | Source PSD |

---

## 3. Removed Model Providers

Upstream providers removed to simplify the UI for NRI users. On merge, upstream may re-add these imports — **let the conflict happen** and re-remove them.

| Removed import in `src/shared/providers/index.ts` |
|---|
| `deepseek` |
| `siliconflow` |
| `lmstudio` |
| `groq` |
| `xai` |
| `mistral-ai` |
| `volcengine` |
| `chatglm` |

---

## 4. MCP (Model Context Protocol) Customizations

### 4a. Replaced built-in MCP servers

`src/renderer/packages/mcp/builtin.ts` — Removed upstream's built-in servers (Fetch, Sequential Thinking, EdgeOne Pages, arXiv, Context7) and replaced with NRI servers:

| Server ID | Name | URL | OAuth |
|---|---|---|---|
| `atlassian` | Atlassian | `https://mcp.atlassian.com/v1/mcp` | Yes |
| `land-trends` | Land Trends | `https://data.txlandtrends.org/mcp` | No |
| `proposal-tracker` | Proposal Tracker | `https://proposals.nri.tamu.edu/mcp` | Yes |

Also removed the `licenseKey` parameter from `getBuiltinServerConfig()` — NRI servers don't use Chatbox AI licensing.

### 4b. OAuth support for MCP (new feature)

Added OAuth flow for MCP servers that require authentication (Atlassian, Proposal Tracker).

| File | Status | What changed |
|---|---|---|
| `src/shared/types/mcp.ts` | Modified | Added `oauth?: boolean` to HTTP transport config |
| `src/shared/types/settings.ts` | Modified | Added `oauth` to Zod schema for MCP transport |
| `src/shared/electron-types.ts` | Modified | Added `onMcpOAuthCallback` to `ElectronIPC` |
| `src/main/deeplinks.ts` | Modified | Handle `chatbox://mcp/oauth-callback?code=...&state=...` deep link |
| `src/preload/index.ts` | Modified | Bridge `mcp:oauth-callback` IPC event to renderer |
| `src/renderer/packages/mcp/electron-oauth-provider.ts` | **New** | `ElectronOAuthProvider` class implementing OAuth PKCE flow |
| `src/renderer/packages/mcp/controller.ts` | Modified | Added OAuth retry logic using `UnauthorizedError`; passes `serverId`/`serverName` through to transport |
| `src/renderer/index.tsx` | Modified | Added `URL.canParse` polyfill for older Electron versions |

### 4c. Removed premium gating for MCP

| File | What changed |
|---|---|
| `src/renderer/components/mcp/MCPMenu.tsx` | Removed `useAutoValidate` (premium check); shows built-in servers unconditionally |
| `src/renderer/components/settings/mcp/BuiltinServersSection.tsx` | Removed premium check; all built-in servers always accessible; removed "Chatbox" prefix and subscription copy |
| `src/renderer/setup/mcp_bootstrap.ts` | Removed `licenseKey` from bootstrap flow |

### 4d. Default enabled servers

`src/shared/defaults.ts` — Changed `enabledBuiltinServers` default from `[]` to `['land-trends']`.

---

## 5. Removed Default Chat Sessions

`src/renderer/packages/initial_data.ts` — Deleted 4 example sessions (Travel Guide, Social Media Influencer, Software Developer, Translator) from the English defaults. Kept the first "Chat" session.

---

## 6. CI/CD & Build Config

| File | Status | What changed |
|---|---|---|
| `azure-pipelines.yml` | **New** | Azure DevOps CI/CD pipeline for building and releasing |
| `custom_win_sign.js` | **New** | Windows code signing script |
| `electron.vite.config.ts` | Modified | Added `@mui/material` to `optimizeDeps.include` |
| `.vscode/launch.json` | **New** | VS Code debug launch config |

---

## 7. Dev/Tooling Files (no merge risk)

| File | Status | Description |
|---|---|---|
| `CLAUDE.md` | **New** | Claude Code project instructions |
| `.claude/settings.local.json` | **New** | Claude Code local settings |

---

## Merge Strategy Recommendations

### Always keep ours (use `.gitattributes` merge=ours)
- All files in `assets/`, `resources/` (binary branding)
- `src/renderer/favicon.ico`, `src/renderer/static/icon.png`
- `src/renderer/static/icons/providers/agrilife.*`
- `azure-pipelines.yml`, `custom_win_sign.js`
- `CLAUDE.md`, `.claude/`, `.vscode/`

### Merge carefully (review conflicts manually)
- `src/shared/providers/index.ts` — re-remove unwanted providers
- `src/renderer/packages/mcp/builtin.ts` — keep our servers, ignore theirs
- `src/renderer/packages/mcp/controller.ts` — merge our OAuth additions with any upstream MCP changes
- `src/renderer/static/globals.css` — keep our brand colors
- `electron-builder.yml` — keep our publish config, accept other changes
- `src/shared/types/*.ts` — accept upstream additions, keep ours too

### Accept upstream (safe to take their version + re-apply small changes)
- `src/renderer/index.ejs` / `index.html` — our changes are just title + whitespace, easy to re-apply
- `src/renderer/Sidebar.tsx` — two-line change, easy to re-apply
- `src/main/menu.ts` — string replacement only
