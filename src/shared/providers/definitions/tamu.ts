import { ModelProviderEnum, ModelProviderType } from '../../types'
import { defineProvider } from '../registry'
import Tamu from './models/tamu'

export const tamu = defineProvider({
  id: ModelProviderEnum.Tamu,
  name: 'TAMU',
  type: ModelProviderType.OpenAI,
  urls: {
    website: 'https://www.tamu.edu/',
  },
  defaultSettings: {
    apiHost: 'https://chat-api.tamu.ai',
    models: [
      {
        modelId: 'protected.Claude Sonnet 4.5',
        nickname: 'Sonnet 4.5',
        capabilities: ['vision', 'reasoning', 'tool_use'],
        contextWindow: 200_000,
        maxOutput: 64_000,
      },
      {
        modelId: 'protected.Claude Opus 4.5',
        nickname: 'Opus 4.5',
        capabilities: ['vision', 'reasoning', 'tool_use'],
        contextWindow: 200_000,
        maxOutput: 64_000,
      },
      {
        modelId: 'protected.Claude-Haiku-4.5',
        nickname: 'Haiku 4.5',
        capabilities: ['vision', 'reasoning', 'tool_use'],
        contextWindow: 200_000,
        maxOutput: 64_000,
      },
      {
        modelId: 'protected.gpt-5.2',
        nickname: 'GPT 5.2',
        capabilities: ['vision', 'reasoning', 'tool_use'],
        contextWindow: 400_000,
        maxOutput: 128_000,
      },
    ],
  },
  createModel: (config) => {
    return new Tamu(
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
    return `TAMU (${providerSettings?.models?.find((m) => m.modelId === modelId)?.nickname || modelId})`
  },
})
