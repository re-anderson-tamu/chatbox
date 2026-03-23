import { ModelProviderEnum, ModelProviderType } from '../../types'
import { defineProvider } from '../registry'
import Agrilife from './models/agrilife'

export const agrilife = defineProvider({
  id: ModelProviderEnum.Agrilife,
  name: 'AgriLife',
  type: ModelProviderType.OpenAI,
  urls: {
    website: 'https://agrilife.tamu.edu/',
  },
  defaultSettings: {
    apiHost: 'https://chat-api.ag.tamus.ai',
    models: [
      {
        modelId: 'protected.Claude Sonnet 4.5',
        nickname: 'Sonnet 4.5',
        capabilities: ['reasoning', 'tool_use'],
        contextWindow: 200_000,
        maxOutput: 64_000,
      },
      {
        modelId: 'protected.Claude Opus 4.5',
        nickname: 'Opus 4.5',
        capabilities: ['reasoning', 'tool_use'],
        contextWindow: 200_000,
        maxOutput: 64_000,
      },
      {
        modelId: 'map-reviewer',
        nickname: 'Map Reviewer',
        capabilities: ['reasoning', 'tool_use'],
        contextWindow: 200_000,
        maxOutput: 64_000,
      },
    ],
  },
  createModel: (config) => {
    return new Agrilife(
      {
        apiKey: config.providerSetting.apiKey || '',
        model: config.model,
        temperature: config.settings.temperature,
        topP: config.settings.topP,
        maxOutputTokens: config.settings.maxTokens,
        stream: config.settings.stream,
      },
      config.dependencies
    )
  },
  getDisplayName: (modelId, providerSettings) => {
    return `AgriLife (${providerSettings?.models?.find((m) => m.modelId === modelId)?.nickname || modelId})`
  },
})
