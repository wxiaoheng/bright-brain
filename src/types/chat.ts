export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
  // events: SessionEvent[]
}

export interface SessionEvent {
  id: string
  type: 'created' | 'updated' | 'archived'
  timestamp: number
  description: string
}

export interface SessionFilter {
  query: string
  dateFrom?: number
  dateTo?: number
}
