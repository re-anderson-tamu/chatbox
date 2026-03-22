import type { OAuthClientInformation, OAuthClientMetadata, OAuthClientProvider, OAuthTokens } from '@ai-sdk/mcp'

export class ElectronOAuthProvider implements OAuthClientProvider {
  private _codeVerifier?: string
  private _codePromise?: Promise<string>
  private _redirectUrl?: string
  private readonly _state: string

  constructor(
    private readonly serverId: string,
    private readonly serverName: string,
    private readonly preConfiguredClientId?: string,
    private readonly preConfiguredClientSecret?: string,
  ) {
    this._state = crypto.randomUUID()
  }

  get redirectUrl(): string {
    // This is set asynchronously before the OAuth flow begins via init().
    // Fall back to a placeholder — the actual URL is always resolved before use.
    return this._redirectUrl || 'http://127.0.0.1/mcp/oauth-callback'
  }

  /**
   * Must be called before the OAuth flow starts to resolve the localhost redirect URL.
   */
  async init() {
    if (!this._redirectUrl) {
      this._redirectUrl = await window.electronAPI.invoke('mcp:oauth-redirect-url')
    }
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
    // If a client ID was pre-configured (server doesn't support dynamic registration),
    // always return it directly — skip the store.
    if (this.preConfiguredClientId) {
      return {
        client_id: this.preConfiguredClientId,
        client_secret: this.preConfiguredClientSecret,
      }
    }
    try {
      const json = await window.electronAPI.invoke('getStoreBlob', `mcp-oauth-client-${this.serverId}`)
      return json ? JSON.parse(json) : undefined
    } catch {
      return undefined
    }
  }

  async saveClientInformation(info: OAuthClientInformation) {
    // Don't overwrite pre-configured credentials
    if (this.preConfiguredClientId) return
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
    // Ask the main process to wait for the OAuth callback on the localhost server.
    // This promise resolves when the provider redirects back to our localhost URL.
    this._codePromise = window.electronAPI.invoke('mcp:oauth-wait-callback', this._state)
    await window.electronAPI.invoke('openLink', authorizationUrl.toString())
  }

  saveCodeVerifier(codeVerifier: string) {
    this._codeVerifier = codeVerifier
  }

  codeVerifier(): string {
    if (!this._codeVerifier) throw new Error('No code verifier saved')
    return this._codeVerifier
  }

  // Provide our own state so we can match the callback to this provider instance
  state(): string {
    return this._state
  }

  /**
   * Returns the promise that resolves with the auth code once the user
   * completes the browser-based OAuth flow and the localhost callback fires.
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
