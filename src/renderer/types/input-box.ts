import type { Message } from '../../shared/types'

export interface PreprocessedFile {
  file: File
  content: string
  storageKey: string
  tokenCountMap?: Record<string, number>
  lineCount?: number
  byteLength?: number
  error?: string
}

export interface PreprocessedLink {
  url: string
  title: string
  content: string
  storageKey: string
  tokenCountMap?: Record<string, number>
  lineCount?: number
  byteLength?: number
  error?: string
}

export type PreprocessingStatus = 'processing' | 'completed' | 'error'

export interface PreConstructedMessageState {
  text: string
  pictureKeys: string[]
  attachments: File[]
  links: { url: string }[]
  preprocessedFiles: PreprocessedFile[]
  preprocessedLinks: PreprocessedLink[]
  message?: Message
  preprocessingStatus: {
    files: Record<string, PreprocessingStatus | undefined>
    links: Record<string, PreprocessingStatus | undefined>
  }
  preprocessingPromises: {
    files: Map<string, Promise<unknown>>
    links: Map<string, Promise<unknown>>
  }
}
