import { ref, computed } from 'vue'
import type { ChatSession, Message} from '../types/chat'
import {v4 as uuid} from 'uuid';

const sessions = ref<ChatSession[]>([])
const currentSessionId = ref<string | null>(null)

// 生成唯一ID
const generateId = () => uuid()

// 创建新会话
export const createSession = () => {
  const id = generateId()
  const newSession: ChatSession = {
    id,
    title: 'New Chat',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
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
export const switchSession = async (sessionId: string) => {
  currentSessionId.value = sessionId
  const currentSession = useCurrentSession();
  if (currentSession.value){
    const result = await window.electronAPI.messages.get(sessionId);
    if (result.success && Array.isArray(result.messages)){
      currentSession.value.messages = result.messages.map(value=>{
        const {role, content, created_at, attachments, references} = value;
        return {
          role,
          content,
          timestamp: created_at,
          attachments:JSON.parse(attachments || '[]'),
          references:references || '',
        }
      })
    }
  }
}

// 删除会话
export const deleteSession = async (sessionId: string) => {
  sessions.value = sessions.value.filter(s => s.id !== sessionId)
  await window.electronAPI.sessions.delete(sessionId);
  if (currentSessionId.value === sessionId) {
    currentSessionId.value = sessions.value[0]?.id || null
    if (currentSessionId.value){
      switchSession(currentSessionId.value)
    }
  }
}

// 更新会话标题
export const updateSessionTitle = (sessionId: string, title: string) => {
  const session = sessions.value.find(s => s.id === sessionId)
  if (session) {
    session.title = title
    session.updatedAt = Date.now()
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
      session.title.toLowerCase().includes(lowerQuery) 
      // || session.summary.toLowerCase().includes(lowerQuery) 
      // || session.messages.some(msg => msg.content.toLowerCase().includes(lowerQuery))
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
  }
}

// 导出当前会话ID
export const useCurrentSessionId = () => {
  return currentSessionId
}

// 初始化
export const initializeSessions = async () => {
  const results = await window.electronAPI.sessions.get();
  if (results.success && Array.isArray(results.sessions)){
    sessions.value = results.sessions.map(value=>{
      const {id, title, created_at, updated_at, size} = value;
      return {
        id,
        title,
        messages:[],
        createdAt:created_at,
        updatedAt:updated_at
      }
    });
  }
  if (sessions.value.length === 0) {
    createSession()
  }
}
