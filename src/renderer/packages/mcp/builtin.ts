import { getLicenseKey } from '@/stores/settingActions'
import type { MCPServerConfig } from './types'
import i18n from '@/i18n'

export interface BuildinMCPServerConfig {
  id: string
  name: string
  description: string
  url: string
}

export const BUILTIN_MCP_SERVERS: BuildinMCPServerConfig[] = [
  {
    id: 'fetch',
    name: 'Fetch',
    description: i18n.t(
      'This server enables LLMs to retrieve and process content from web pages, converting HTML to markdown for easier consumption.'
    ),
    url: 'https://mcp.chatboxai.app/fetch',
  },

  {
    id: 'context7',
    name: 'Context7',
    description: i18n.t('Retrieves up-to-date documentation and code examples for any library.'),
    url: 'https://mcp.chatboxai.app/context7',
  },
  {
    id: 'land-trends',
    name: 'Land Trends',
    description: i18n.t(
      'Access Texas land trend data, including land use change, conservation, and natural resource statistics.'
    ),
    url: 'https://data.txlandtrends.org/mcp',
  },
]

export function getBuiltinServerConfig(id: string, licenseKey?: string): MCPServerConfig | null {
  const config = BUILTIN_MCP_SERVERS.find((s) => s.id === id)
  if (!config) {
    return null
  }
  const license = licenseKey || getLicenseKey()
  return {
    id,
    name: config.name,
    enabled: true,
    transport: {
      type: 'http',
      url: config.url,
      headers: license ? { 'x-chatbox-license': license } : undefined,
    },
  }
}
