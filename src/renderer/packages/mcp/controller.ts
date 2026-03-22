import { UnauthorizedError, experimental_createMCPClient as createMCPClient } from '@ai-sdk/mcp'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { ToolSet } from 'ai'
import Emittery from 'emittery'
import { isEqual } from 'lodash'
import { ElectronOAuthProvider } from './electron-oauth-provider'
import { IPCStdioTransport } from './ipc-stdio-transport'
import type { MCPServerConfig, MCPServerStatus } from './types'

type TransportConfig = MCPServerConfig['transport']
type MCPClient = Awaited<ReturnType<typeof createMCPClient>>

function isUnauthorizedError(err: unknown): boolean {
  return err instanceof UnauthorizedError
}

async function createClient(
  transportConfig: TransportConfig,
  serverId: string,
  serverName: string,
  name = 'chatbox-mcp-client',
): Promise<MCPClient> {
  if (transportConfig.type === 'stdio') {
    const transport = await IPCStdioTransport.create(transportConfig)
    let errorMessage = ''
    try {
      return await createMCPClient({
        name,
        transport,
        onUncaughtError(error: unknown) {
          console.error('mcp:client:onUncaughtError', error)
          errorMessage += (error as Error).message
        },
      })
    } catch (err) {
      transport.close().catch(console.error)
      let message = (err as Error).message
      if (errorMessage && !message.includes(errorMessage)) {
        message += `\n${errorMessage}`
      }
      throw new Error(message, { cause: err })
    }
  }
  if (transportConfig.type === 'http') {
    // On Electron, always attach an OAuth provider so that any 401 triggers the OAuth flow automatically.
    const useOAuth = !!window.electronAPI
    const authProvider = useOAuth
      ? new ElectronOAuthProvider(serverId, serverName, transportConfig.oauthClientId, transportConfig.oauthClientSecret)
      : undefined
    if (authProvider) {
      await authProvider.init()
    }

    const transportOptions = {
      requestInit: { headers: transportConfig.headers },
      ...(authProvider ? { authProvider } : {}),
    }

    try {
      const transport = new StreamableHTTPClientTransport(new URL(transportConfig.url), transportOptions)
      return await createMCPClient({
        name,
        transport,
        onUncaughtError(error: unknown) {
          console.error('mcp:client:onUncaughtError', error)
        },
      })
    } catch (err) {
      if (isUnauthorizedError(err) && authProvider) {
        // OAuth was initiated — browser has been opened. Wait for the localhost callback.
        const codePromise = authProvider.getCodePromise()
        if (!codePromise) throw err
        const code = await codePromise
        const transport = new StreamableHTTPClientTransport(new URL(transportConfig.url), transportOptions)
        await transport.finishAuth(code)
        // Retry now that tokens are saved
        return await createMCPClient({
          name,
          transport,
          onUncaughtError(error: unknown) {
            console.error('mcp:client:onUncaughtError', error)
          },
        })
      }
      // Not a 401, or no OAuth available — try SSE fallback
      if (!isUnauthorizedError(err)) {
        console.error('Streamable HTTP connection failed', err)
        try {
          return await createMCPClient({
            name,
            transport: {
              type: 'sse',
              url: transportConfig.url,
              headers: transportConfig.headers,
            },
            onUncaughtError(error: unknown) {
              console.error('mcp:client:onUncaughtError', error)
            },
          })
        } catch {
          // SSE fallback also failed — throw the original error
        }
      }
      throw err
    }
  }
  throw new Error('Unknown transport type')
}

export class MCPServer extends Emittery<{ status: MCPServerStatus }> {
  private _status: MCPServerStatus = { state: 'idle' }
  private client?: MCPClient
  private tools?: ToolSet

  constructor(
    private readonly transportConfig: TransportConfig,
    private readonly serverId: string,
    private readonly serverName: string,
  ) {
    super()
  }

  get status() {
    return this._status
  }

  set status(status: MCPServerStatus) {
    this._status = status
    this.emit('status', status)
  }

  async start() {
    if (this.status.state !== 'idle') {
      return
    }
    this.status = { state: 'starting' }
    try {
      this.client = await createClient(this.transportConfig, this.serverId, this.serverName)
      this.tools = await this.client.tools()
    } catch (err) {
      console.error('mcp:client:start', err)
      this.status = { state: 'idle', error: (err as Error).message }
      return
    }
    this.status = { state: 'running' }
  }

  async stop() {
    if (this.status.state !== 'running') {
      return
    }
    this.status = { state: 'stopping' }
    await this.client?.close()
    this.tools = undefined
    this.status = { state: 'idle' }
  }

  getAvailableTools(): ToolSet {
    if (!this.client || this.status.state !== 'running') {
      return {}
    }
    return this.tools || {}
  }
}

// 根据用户配置管理MCP服务器的实际运行
export const mcpController = {
  servers: new Map<string, { instance: MCPServer; config: MCPServerConfig }>(),
  _statusSubscribers: new Map<string, Set<(status: MCPServerStatus) => void>>(),

  bootstrap(serverConfigs: MCPServerConfig[]) {
    for (const serverConfig of serverConfigs) {
      if (serverConfig.enabled) {
        void this.startServer(serverConfig)
      }
    }
  },

  async startServer(serverConfig: MCPServerConfig) {
    if (!serverConfig.enabled) {
      return
    }
    const server = new MCPServer(serverConfig.transport, serverConfig.id, serverConfig.name)
    this.servers.set(serverConfig.id, { instance: server, config: serverConfig })

    // 如果有订阅者，重新连接他们
    const subscribers = this._statusSubscribers.get(serverConfig.id)
    if (subscribers) {
      subscribers.forEach((subscriber) => {
        server.on('status', subscriber)
      })
    }

    await server.start()
  },

  async stopServer(id: string) {
    const server = this.servers.get(id)
    this.servers.delete(id)
    await server?.instance.stop()
    server?.instance.clearListeners()
  },

  async updateServer(serverConfig: MCPServerConfig) {
    if (!serverConfig.enabled) {
      await this.stopServer(serverConfig.id)
      return
    }
    const server = this.servers.get(serverConfig.id)
    if (!server) {
      await this.startServer(serverConfig)
      return
    }
    if (isEqual(server.config.transport, serverConfig.transport)) {
      server.config = serverConfig
    } else {
      await this.stopServer(serverConfig.id)
      await this.startServer(serverConfig)
    }
  },

  getServer(id: string): MCPServer | undefined {
    const server = this.servers.get(id)
    return server?.instance
  },

  subscribeToServerStatus(id: string, callback: (status: MCPServerStatus) => void) {
    let subscribers = this._statusSubscribers.get(id)
    if (!subscribers) {
      subscribers = new Set()
      this._statusSubscribers.set(id, subscribers)
    }
    subscribers.add(callback)

    const server = this.getServer(id)
    if (server) {
      server.on('status', callback)
      callback(server.status)
    }

    return () => {
      server?.off('status', callback)
      subscribers.delete(callback)
    }
  },

  getAvailableTools(): ToolSet {
    const toolSet: ToolSet = {}
    for (const { instance, config } of this.servers.values()) {
      const mcpTools = instance.getAvailableTools()
      for (const [toolName, tool] of Object.entries(mcpTools)) {
        const rawExecute = tool.execute?.bind(tool)
        toolSet[normalizeToolName(config.name, toolName)] = {
          ...tool,
          execute: async (args, options) => {
            try {
              return await rawExecute?.(args, options)
            } catch (err) {
              // 返回而非抛出，否则会导致流程中断
              return err
            }
          },
        }
      }
    }
    return toolSet
  },
}

const SERVER_NAME_REGEX = /^[A-Za-z0-9_-]+$/

function normalizeToolName(serverName: string, toolName: string) {
  serverName = serverName.replace(/\s+/g, '_')
  if (SERVER_NAME_REGEX.test(serverName)) {
    return `mcp__${serverName.toLowerCase()}__${toolName}`
  }
  return `mcp__${toolName}`
}
