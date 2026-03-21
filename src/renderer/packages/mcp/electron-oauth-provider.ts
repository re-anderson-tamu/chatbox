import type { OAuthClientInformation, OAuthClientMetadata, OAuthClientProvider, OAuthTokens } from '@ai-sdk/mcp'

// Module-level registry: OAuth state value → resolver for the auth code
const pendingCallbacks = new Map<string, (code: string) => void>()

let callbackListenerInitialized = false

function initCallbackListener() {
  if (callbackListenerInitialized || !window.electronAPI?.onMcpOAuthCallback) return
  callbackListenerInitialized = true
  window.electronAPI.onMcpOAuthCallback((code, state) => {
    const resolve = pendingCallbacks.get(state)
    if (resolve) {
      pendingCallbacks.delete(state)
      resolve(code)
    }
  })
}

export class ElectronOAuthProvider implements OAuthClientProvider {
  private _codeVerifier?: string
  private _codePromise?: Promise<string>
  private readonly _state: string

  constructor(
    private readonly serverId: string,
    private readonly serverName: string,
  ) {
    this._state = crypto.randomUUID()
    initCallbackListener()
  }

  // Provide our own state so we can match the callback to this provider instance
  state(): string {
    return this._state
  }

  get redirectUrl(): string {
    return 'chatbox://mcp/oauth-callback'
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: `Chatbox - ${this.serverName}`,
      redirect_uris: [this.redirectUrl],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
    }
  }

  async clientInformation(): Promise<OAuthClientInformation | undefined> {
    try {
      const json = await window.electronAPI.invoke('getStoreBlob', `mcp-oauth-client-${this.serverId}`)
      return json ? JSON.parse(json) : undefined
    } catch {
      return undefined
    }
  }

  async saveClientInformation(info: OAuthClientInformation) {
    await window.electronAPI.invoke('setStoreBlob', `mcp-oauth-client-${this.serverId}`, JSON.stringify(info))
  }

  async tokens(): Promise<OAuthTokens | undefined> {
    try {
      const json = await window.electronAPI.invoke('getStoreBlob', `mcp-oauth-tokens-${this.serverId}`)
      return json ? JSON.parse(json) : undefined
    } catch {
      return undefined
    }
  }

  async saveTokens(tokens: OAuthTokens) {
    await window.electronAPI.invoke('setStoreBlob', `mcp-oauth-tokens-${this.serverId}`, JSON.stringify(tokens))
  }

  async redirectToAuthorization(authorizationUrl: URL) {
    // Register callback before opening the browser to avoid any race condition
    this._codePromise = new Promise<string>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        pendingCallbacks.delete(this._state)
        reject(new Error('OAuth flow timed out — browser window was closed or took too long'))
      }, 5 * 60 * 1000)
      pendingCallbacks.set(this._state, (code: string) => {
        clearTimeout(timeoutId)
        resolve(code)
      })
    })
    await window.electronAPI.invoke('openLink', authorizationUrl.toString())
  }

  saveCodeVerifier(codeVerifier: string) {
    this._codeVerifier = codeVerifier
  }

  codeVerifier(): string {
    if (!this._codeVerifier) throw new Error('No code verifier saved')
    return this._codeVerifier
  }

  /**
   * Returns the promise that resolves with the auth code once the user
   * completes the browser-based OAuth flow and the deep link callback fires.
   */
  getCodePromise(): Promise<string> | undefined {
    return this._codePromise
  }

  /**
   * Clear stored tokens to force re-authentication.
   */
  async clearTokens() {
    await window.electronAPI.invoke('delStoreBlob', `mcp-oauth-tokens-${this.serverId}`)
  }
}
