import { ref, computed } from 'vue'
import type { ChatSession, Message, SessionEvent, SessionFilter } from '../types/chat'

const sessions = ref<ChatSession[]>([])
const currentSessionId = ref<string | null>(null)

// 生成唯一ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

// 创建新会话
export const createSession = () => {
  const id = generateId()
  const newSession: ChatSession = {
    id,
    title: 'New Chat',
    summary: 'New conversation started',
    messages: [
      {
        role: 'assistant',
        content: 'Hello! I am Bright Brain, your AI assistant. How can I help you today?',
        timestamp: Date.now(),
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    events: [
      {
        id: generateId(),
        type: 'created',
        timestamp: Date.now(),
        description: 'Session created',
      },
    ],
  }

  sessions.value.unshift(newSession)
  currentSessionId.value = id

  return newSession
}

// 获取当前会话
export const useCurrentSession = () => {
  return computed(() => {
    if (!currentSessionId.value) return null
    return sessions.value.find(s => s.id === currentSessionId.value) || null
  })
}

// 获取所有会话
export const useSessions = () => {
  return sessions
}

// 切换会话
export const switchSession = (sessionId: string) => {
  currentSessionId.value = sessionId
}

// 删除会话
export const deleteSession = (sessionId: string) => {
  sessions.value = sessions.value.filter(s => s.id !== sessionId)
  if (currentSessionId.value === sessionId) {
    currentSessionId.value = sessions.value[0]?.id || null
  }
}

// 更新会话标题
export const updateSessionTitle = (sessionId: string, title: string) => {
  const session = sessions.value.find(s => s.id === sessionId)
  if (session) {
    session.title = title
    session.updatedAt = Date.now()
    session.events.push({
      id: generateId(),
      type: 'updated',
      timestamp: Date.now(),
      description: `Title updated to: ${title}`,
    })
  }
}

// 添加消息到当前会话
export const addMessage = (message: Message) => {
  const session = sessions.value.find(s => s.id === currentSessionId.value)
  if (session) {
    session.messages.push(message)
    session.updatedAt = Date.now()

    // 更新会话标题（如果是第一条用户消息）
    if (message.role === 'user' && session.messages.filter(m => m.role === 'user').length === 1) {
      session.title = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '')
      session.events.push({
        id: generateId(),
        type: 'updated',
        timestamp: Date.now(),
        description: `Title set from first message`,
      })
    }

    // 更新摘要（简单的最后一条助手回复）
    if (message.role === 'assistant') {
      session.summary = message.content.substring(0, 100) + (message.content.length > 100 ? '...' : '')
      session.events.push({
        id: generateId(),
        type: 'updated',
        timestamp: Date.now(),
        description: `Summary updated`,
      })
    }
  }
}

// 搜索会话
export const searchSessions = (query: string): ChatSession[] => {
  if (!query.trim()) {
    return sessions.value
  }

  const lowerQuery = query.toLowerCase()
  return sessions.value.filter(session => {
    return (
      session.title.toLowerCase().includes(lowerQuery) ||
      session.summary.toLowerCase().includes(lowerQuery) ||
      session.messages.some(msg => msg.content.toLowerCase().includes(lowerQuery))
    )
  })
}

// 按日期过滤会话
export const filterSessionsByDate = (dateFrom?: number, dateTo?: number): ChatSession[] => {
  return sessions.value.filter(session => {
    if (dateFrom && session.createdAt < dateFrom) return false
    if (dateTo && session.createdAt > dateTo) return false
    return true
  })
}

// 清空当前会话
export const clearCurrentSession = () => {
  const session = sessions.value.find(s => s.id === currentSessionId.value)
  if (session) {
    session.messages = [
      {
        role: 'assistant',
        content: 'Hello! I am Bright Brain, your AI assistant. How can I help you today?',
        timestamp: Date.now(),
      },
    ]
    session.updatedAt = Date.now()
    session.events.push({
      id: generateId(),
      type: 'updated',
      timestamp: Date.now(),
      description: 'Messages cleared',
    })
  }
}

// 导出当前会话ID
export const useCurrentSessionId = () => {
  return currentSessionId
}

// 初始化：创建第一个会话
export const initializeSessions = () => {
  if (sessions.value.length === 0) {
    createSession()
  }
}
