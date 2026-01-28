<template>
  <div class="chat-wrapper">
    <SessionSidebar />
    <div class="chat-container">
      <div class="chat-header">
        <h2>{{ currentSession?.title || 'AI Chat' }}</h2>
      </div>

      <div class="messages" ref="messagesContainer">
        <div
          v-for="(message, index) in currentSession?.messages || []"
          :key="index"
          class="message"
          :class="message.role"
        >
          <div class="message-avatar">
            <span v-if="message.role === 'user'">👤</span>
            <span v-else>🤖</span>
          </div>
          <div class="message-content">
            <div class="message-text" v-html="renderMessage(message.content)"></div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>

        <div v-if="isLoading && !isStreaming" class="message assistant">
          <div class="message-avatar">
            <span>🤖</span>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <div class="input-container">
        <textarea
          v-model="inputMessage"
          @keydown="handleKeyDown"
          placeholder="输入你的问题，回车发送"
          ref="textarea"
          class="chat-input"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import SessionSidebar from '../components/SessionSidebar.vue'
import { useCurrentSession, addMessage, clearCurrentSession, createSession } from '../services/useChatSessions'
import { renderMarkdown } from '../services/useMarkdown'
import { initializeSessions } from '../services/useChatSessions'
import type { Message } from '../types/chat'

const currentSession = useCurrentSession()
const inputMessage = ref('')
const isLoading = ref(false)
const isStreaming = ref(false)
const messagesContainer = ref<HTMLElement>()
const textarea = ref<HTMLTextAreaElement>()
let streamListener: ((event: any, data: any) => void) | null = null

const renderMessage = (content: string) => {
  return renderMarkdown(content)
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const clearChat = () => {
  createSession()
  scrollToBottom()
}

const sendMessage = async () => {
  const message = inputMessage.value.trim()
  if (!message || isLoading.value) return

  addMessage({
    role: 'user',
    content: message,
    timestamp: Date.now(),
  })

  inputMessage.value = ''
  isLoading.value = true
  isStreaming.value = false
  await scrollToBottom()

  const thinkingMessage: Message = {
    role: 'assistant',
    content: '正在思考...',
    timestamp: Date.now(),
  }
  addMessage(thinkingMessage)
  isStreaming.value = true

  await new Promise(resolve => setTimeout(resolve, 500))

  try {
    await window.electronAPI.chat.sendMessage(message)
  } catch (error) {
    const session = currentSession.value
    if (session && session.messages.length > 0) {
      const lastMessage = session.messages[session.messages.length - 1]
      if (lastMessage.role === 'assistant') {
        lastMessage.content = 'Sorry, something went wrong. Please try again.'
      }
    }
  }

  isLoading.value = false
  await scrollToBottom()
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendMessage()
  }
}

onMounted(() => {
  initializeSessions()
  scrollToBottom()

  if (window.electronAPI) {
    const removeListener = window.electronAPI.chat.onStream((data: any) => {
      const session = currentSession.value
      if (session && session.messages.length > 0) {
        const lastMessage = session.messages[session.messages.length - 1]
        if (lastMessage.role === 'assistant') {
          if (data.chunk !== undefined) {
            lastMessage.content = data.chunk
          }
          if (data.done) {
            isStreaming.value = false
          }
        }
      }
      scrollToBottom()
    })

    streamListener = removeListener as any
  }
})

onUnmounted(() => {
  if (window.electronAPI && streamListener) {
    ;(streamListener as () => void)()
  }
})

watch(currentSession, () => {
  scrollToBottom()
})
</script>

<style scoped>
.chat-wrapper {
  display: flex;
  height: 100%;
  background: var(--bg-primary);
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.chat-header {
  padding: 20px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background 0.3s, border-color 0.3s;
}

.chat-header h2 {
  font-size: 20px;
  color: var(--text-primary);
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message {
  display: flex;
  gap: 12px;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message.assistant .message-avatar {
  background: var(--accent-color);
}

.message-content {
  max-width: 70%;
}

.message.user .message-content {
  align-items: flex-end;
}

.message-text {
  padding: 12px 16px;
  border-radius: 16px;
  line-height: 1.6;
  color: var(--text-primary);
  overflow-wrap: break-word;
}

/* Markdown 样式 */
.message-text :deep(h1),
.message-text :deep(h2),
.message-text :deep(h3),
.message-text :deep(h4),
.message-text :deep(h5),
.message-text :deep(h6) {
  margin: 16px 0 8px 0;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary);
}

.message-text :deep(h1) {
  font-size: 1.5em;
}

.message-text :deep(h2) {
  font-size: 1.3em;
}

.message-text :deep(h3) {
  font-size: 1.1em;
}

.message-text :deep(p) {
  margin: 8px 0;
}

.message-text :deep(code) {
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  color: var(--text-primary);
  border: 1px solid var(--code-border);
}

.message-text :deep(pre) {
  background: var(--code-bg);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
  border: 1px solid var(--code-border);
}

.message-text :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 0.85em;
  line-height: 1.6;
  border: none;
}

.message-text :deep(ul),
.message-text :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.message-text :deep(li) {
  margin: 4px 0;
}

.message-text :deep(blockquote) {
  border-left: 4px solid var(--accent-color);
  padding-left: 12px;
  margin: 12px 0;
  color: var(--text-secondary);
  font-style: italic;
  background: var(--blockquote-bg);
  padding: 8px 12px;
  border-radius: 0 4px 4px 0;
}

.message-text :deep(a) {
  color: var(--accent-color);
  text-decoration: underline;
}

.message-text :deep(a:hover) {
  color: var(--accent-hover);
}

.message-text :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
}

.message-text :deep(th),
.message-text :deep(td) {
  border: 1px solid var(--table-border);
  padding: 8px 12px;
  text-align: left;
}

.message-text :deep(th) {
  background: var(--table-header-bg);
  font-weight: 600;
}

.message-text :deep(tr:nth-child(even)) {
  background: var(--table-row-even-bg);
}

.message-text :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 16px 0;
}

.message-text :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 8px 0;
}

.message.assistant .message-text {
  background: var(--bg-secondary);
  border-top-left-radius: 4px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
}

.message.user .message-text {
  background: var(--accent-color);
  border-top-right-radius: 4px;
  color: #ffffff;
  box-shadow: var(--shadow-sm);
}

.message.user .message-text :deep(h1),
.message.user .message-text :deep(h2),
.message.user .message-text :deep(h3),
.message.user .message-text :deep(p),
.message.user .message-text :deep(li) {
  color: #ffffff;
}

.message.user .message-text :deep(code) {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.message.user .message-text :deep(pre) {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(0, 0, 0, 0.3);
  color: #ffffff;
}

.message.user .message-text :deep(pre code) {
  color: #ffffff;
}

.message.user .message-text :deep(a) {
  color: var(--accent-light);
}

.message.user .message-text :deep(a:hover) {
  color: #ffffff;
}

.message-time {
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.message.user .message-time {
  text-align: right;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-radius: 16px;
  border-top-left-radius: 4px;
  border: 1px solid var(--border-color);
  width: fit-content;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: var(--text-secondary);
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-4px);
  }
}

.input-container {
  padding: 20px 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  transition: background 0.3s, border-color 0.3s;
}

.chat-input {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius:  12px;
  padding: 12px 16px;
  color: var(--text-primary);
  font-size: 14px;
  resize: none;
  outline: none;
  min-height: 48px;
  max-height: 150px;
  transition: border-color 0.2s, background 0.3s;
  font-family: inherit;
}

.chat-input:focus {
  border-color: var(--accent-color);
}

.chat-input::placeholder {
  color: var(--text-secondary);
}
</style>
