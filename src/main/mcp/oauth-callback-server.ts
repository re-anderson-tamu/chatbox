import * as http from 'http'
import log from 'electron-log/main'

let server: http.Server | null = null
let serverPort: number | null = null

// Pending OAuth states: state → resolver
const pendingStates = new Map<string, { resolve: (code: string) => void; reject: (err: Error) => void }>()

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><title>Authorization Complete</title></head>
<body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
<div style="text-align:center">
<h2>Authorization successful</h2>
<p>You can close this tab and return to Chatbox.</p>
</div></body></html>`

const ERROR_HTML = (msg: string) => `<!DOCTYPE html>
<html><head><title>Authorization Error</title></head>
<body style="font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
<div style="text-align:center">
<h2>Authorization failed</h2>
<p>${msg}</p>
</div></body></html>`

function ensureServer(): Promise<number> {
  if (server && serverPort) {
    return Promise.resolve(serverPort)
  }

  return new Promise((resolve, reject) => {
    const s = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://localhost`)

      if (url.pathname !== '/mcp/oauth-callback') {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')

      if (!code || !state) {
        res.writeHead(400, { 'Content-Type': 'text/html' })
        res.end(ERROR_HTML('Missing code or state parameter.'))
        return
      }

      const pending = pendingStates.get(state)
      if (pending) {
        pendingStates.delete(state)
        pending.resolve(code)
      }

      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(SUCCESS_HTML)
    })

    // Listen on a random available port
    s.listen(0, '127.0.0.1', () => {
      const addr = s.address()
      if (typeof addr === 'object' && addr) {
        serverPort = addr.port
        server = s
        log.info(`[OAuth] Callback server listening on http://127.0.0.1:${serverPort}`)
        resolve(serverPort)
      } else {
        reject(new Error('Failed to get server address'))
      }
    })

    s.on('error', (err) => {
      log.error('[OAuth] Callback server error:', err)
      reject(err)
    })
  })
}

/**
 * Get the redirect URL for OAuth callbacks.
 * Starts the localhost server if it isn't already running.
 */
export async function getOAuthRedirectUrl(): Promise<string> {
  const port = await ensureServer()
  return `http://127.0.0.1:${port}/mcp/oauth-callback`
}

/**
 * Register a pending OAuth state and wait for the callback.
 * Returns the authorization code when the OAuth provider redirects back.
 */
export function waitForOAuthCallback(state: string, timeoutMs = 5 * 60 * 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingStates.delete(state)
      reject(new Error('OAuth callback timed out'))
    }, timeoutMs)

    pendingStates.set(state, {
      resolve: (code: string) => {
        clearTimeout(timer)
        resolve(code)
      },
      reject: (err: Error) => {
        clearTimeout(timer)
        reject(err)
      },
    })
  })
}

/**
 * Shut down the callback server (call on app quit).
 */
export function closeOAuthCallbackServer() {
  if (server) {
    server.close()
    server = null
    serverPort = null
    pendingStates.clear()
    log.info('[OAuth] Callback server closed')
  }
}
