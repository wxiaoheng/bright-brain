<template>
  <div class="session-sidebar">
    <div class="sidebar-header">
      <h3>历史会话</h3>
      <button @click="handleNewChat" class="new-chat-btn" title="New Chat">
        <span>+</span>
      </button>
    </div>

    <div class="search-section">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="搜索会话..."
        class="search-input"
        @input="handleSearch"
      />
    </div>

    <div class="sessions-list">
      <div
        v-for="session in filteredSessions"
        :key="session.id"
        class="session-item"
        :class="{ active: session.id === currentSessionId }"
        @click="handleSelectSession(session.id)"
      >
        <div class="session-header">
          <span class="session-title">{{ session.title }}</span>
          <button
            @click.stop="handleDeleteSession(session.id)"
            class="delete-btn"
            title="Delete session"
          >
            ×
          </button>
        </div>
        <div class="session-meta">
          <span class="session-date">{{ formatTime(session.updatedAt) }}</span>
          <span class="session-count">{{ session.messages.length }} messages</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSessions, useCurrentSessionId, switchSession, deleteSession, createSession } from '../services/useChatSessions'
import type { ChatSession } from '../types/chat'

const sessions = useSessions()
const currentSessionId = useCurrentSessionId()
const searchQuery = ref('')
const filteredSessions = ref<ChatSession[]>([])

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}分钟前`
  }

  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }

  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000)
    return `${days}天前`
  }

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  })
}


const handleSearch = () => {
  const query = searchQuery.value.trim().toLowerCase()

  if (!query) {
    filteredSessions.value = [...sessions.value]
    return
  }

  filteredSessions.value = sessions.value.filter(session => {
    return (
      session.title.toLowerCase().includes(query) 
      // || session.messages.some(msg => msg.content.toLowerCase().includes(query))
    )
  })
}

const handleSelectSession = (sessionId: string) => {
  switchSession(sessionId)
}

const handleDeleteSession = async (sessionId: string) => {
  if (confirm('确定要删除这个会话吗？')) {
    await deleteSession(sessionId)
    handleSearch()
  }
}

const handleNewChat = () => {
  createSession()
  handleSearch()
}

watch(sessions, () => {
  handleSearch()
}, { deep: true })
</script>

<style scoped>
.session-sidebar {
  width: 320px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: background 0.3s, border-color 0.3s;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.sidebar-header h3 {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.new-chat-btn {
  width: 32px;
  height: 32px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.new-chat-btn:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.search-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
}

.search-input {
  width: 100%;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, background 0.3s;
}

.search-input:focus {
  border-color: var(--accent-color);
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.session-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s, background 0.3s, border-color 0.3s;
}

.session-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-color-hover);
  transform: translateX(2px);
}

.session-item.active {
  background: var(--bg-tertiary);
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px rgba(108, 92, 231, 0.1);
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.session-title {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 600;
  flex: 1;
  line-height: 1.4;
}

.delete-btn {
  width: 24px;
  height: 24px;
  background: transparent;
  color: var(--text-secondary);
  border: none;
  border-radius: 6px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 8px;
  opacity: 0;
  transition: all 0.2s;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: var(--error-color);
  color: white;
}

.session-summary {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.session-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.session-date {
  color: var(--text-secondary);
  font-size: 12px;
}

.session-count {
  color: var(--text-secondary);
  font-size: 12px;
}

.session-events {
  border-top: 1px solid var(--border-color);
  padding-top: 8px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.event-item:last-child {
  margin-bottom: 0;
}

.event-dot {
  width: 6px;
  height: 6px;
  background: var(--accent-color);
  border-radius: 50%;
  flex-shrink: 0;
}

.event-text {
  color: var(--text-secondary);
  font-size: 11px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-time {
  color: var(--accent-color);
  font-size: 11px;
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
}
</style>
