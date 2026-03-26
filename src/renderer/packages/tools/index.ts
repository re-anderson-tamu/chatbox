import { t } from 'i18next'
import { mcpController } from '../mcp/controller'

export function getToolName(toolName: string): string {
  // Use translation keys that i18next cli can detect
  const toolNames: Record<string, string> = {
    query_knowledge_base: t('Query Knowledge Base'),
    get_files_meta: t('Get Files Meta'),
    read_file_chunks: t('Read File Chunks'),
    list_files: t('List Files'),
    web_search: t('Web Search'),
    file_search: t('File Search'),
    code_search: t('Code Search'),
    terminal: t('Terminal'),
    create_file: t('Create File'),
    edit_file: t('Edit File'),
    delete_file: t('Delete File'),
    parse_link: t('Parse Link'),
  }

  if (toolNames[toolName]) {
    return toolNames[toolName]
  }

  // MCP tools: prefer the title from the tool definition, fall back to parsing the name
  if (toolName.startsWith('mcp__')) {
    const mcpTitle = mcpController.getToolTitles()[toolName]
    if (mcpTitle) {
      return mcpTitle
    }
    const parts = toolName.split('__')
    if (parts.length >= 3) {
      const mcpToolName = parts.slice(2).join('_')
      return mcpToolName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }
  }

  return toolName
}
