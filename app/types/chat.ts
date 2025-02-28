export interface ChatMessage {
  id: string
  content: string
  type: 'user' | 'ai'
  timestamp: Date
  status?: 'sending' | 'sent' | 'error'
}

export interface ApiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ApiResponse {
  text: string
  error?: string
} 