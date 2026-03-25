import type { MCPServerConfig } from './types'
import i18n from '@/i18n'

export interface BuildinMCPServerConfig {
  id: string
  name: string
  description: string
  url: string
  oauth?: boolean
  oauthClientId?: string
  oauthClientSecret?: string
}

export const BUILTIN_MCP_SERVERS: BuildinMCPServerConfig[] = [
  {
    id: 'atlassian',
    name: 'Atlassian',
    description: i18n.t(
      'Connect to Atlassian services, including Jira and Confluence, to access your project data and documentation.'
    ),
    url: 'https://mcp.atlassian.com/v1/mcp',
    oauth: true,
  },
  {
    id: 'land-trends',
    name: 'Land Trends',
    description: i18n.t('Access Texas Land Trends data, including land use change, population, and land value.'),
    url: 'https://data.txlandtrends.org/mcp',
  },
  {
    id: 'proposal-tracker',
    name: 'Proposal Tracker',
    description: i18n.t('Access NRI proposal and project data and files.'),
    url: 'https://proposals.nri.tamu.edu/mcp',
    oauth: true,
    oauthClientId: '28d1e5ec-081a-4593-b16a-be98fc9af974',
  },
  {
    id: 'arcgis-portal',
    name: 'Portal for ArcGIS',
    description: i18n.t('Access NRI GIS data in Portal.'),
    url: 'https://gis.nri.tamu.edu/mcp',
    oauth: true,
    oauthClientId: 'SmT24R7RPzOKLK07',
  },
]

export function getBuiltinServerConfig(id: string): MCPServerConfig | null {
  const config = BUILTIN_MCP_SERVERS.find((s) => s.id === id)
  if (!config) {
    return null
  }
  return {
    id,
    name: config.name,
    enabled: true,
    transport: {
      type: 'http',
      url: config.url,
      oauth: config.oauth,
      oauthClientId: config.oauthClientId,
      oauthClientSecret: config.oauthClientSecret,
    },
  }
}
