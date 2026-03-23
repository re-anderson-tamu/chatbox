import * as fs from 'fs'
import * as http from 'http'
import * as path from 'path'
import { app } from 'electron'
import log from 'electron-log/main'

// Fixed port so the redirect URI is predictable and can be pre-registered with OAuth providers.
const OAUTH_CALLBACK_PORT = 28107

let server: http.Server | null = null

// Pending OAuth states: state → resolver
const pendingStates = new Map<string, { resolve: (code: string) => void; reject: (err: Error) => void }>()

const PAGE_STYLE = `font-family:system-ui,sans-serif;display:flex;flex-direction:column;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5`
const CARD_STYLE = `background:#fff;border-radius:12px;padding:40px 48px;text-align:center;box-shadow:0 2px 16px rgba(0,0,0,0.10);max-width:360px;width:100%`
const LOGO_STYLE = `height:80px;margin-bottom:20px`
const LOGO_URL = `https://nri.tamu.edu/img/logos/nri-black.png`

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><title>Authorization Complete</title></head>
<body style="${PAGE_STYLE}">
<div style="${CARD_STYLE}">
<img src="${LOGO_URL}" alt="NRI Logo" style="${LOGO_STYLE}">
<h2 style="margin:0 0 10px">Authorization successful</h2>
<p style="margin:0;color:#555">You can close this tab</p>
</div></body></html>`

const ERROR_HTML = (msg: string) => `<!DOCTYPE html>
<html><head><title>Authorization Error</title></head>
<body style="${PAGE_STYLE}">
<div style="${CARD_STYLE}">
<img src="${LOGO_URL}" alt="NRI Logo" style="${LOGO_STYLE}">
<h2 style="margin:0 0 10px">Authorization failed</h2>
<p style="margin:0;color:#555">${msg}</p>
</div></body></html>`

function ensureServer(): Promise<number> {
  if (server) {
    return Promise.resolve(OAUTH_CALLBACK_PORT)
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

    s.listen(OAUTH_CALLBACK_PORT, '127.0.0.1', () => {
      server = s
      log.info(`[OAuth] Callback server listening on http://127.0.0.1:${OAUTH_CALLBACK_PORT}`)
      resolve(OAUTH_CALLBACK_PORT)
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
    pendingStates.clear()
    log.info('[OAuth] Callback server closed')
  }
}
