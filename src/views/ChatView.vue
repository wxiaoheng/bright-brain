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
            <div v-if="message.attachments && message.attachments.length > 0" class="message-attachments">
              <div
                v-for="(attachment, attIndex) in message.attachments"
                :key="attIndex"
                class="message-attachment"
              >
                <img
                  v-if="attachment.type === 'image'"
                  :src="attachmentPreviewCache[attachment.path] || 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'"
                  :alt="attachment.name"
                  :data-file-path="attachment.path"
                  class="attachment-image"
                  @error="handleImageError"
                  @load="loadAttachmentPreview(attachment.path)"
                />
                <div v-else class="attachment-file">
                  <span class="file-icon">{{ attachment.type === 'video' ? '🎬' : '📎' }}</span>
                  <span class="file-name">{{ attachment.name }}</span>
                </div>
              </div>
            </div>
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
        <div class="input-wrapper">
          <div class="attachments-preview" v-if="selectedFiles.length > 0">
            <div
              v-for="(file, index) in selectedFiles"
              :key="index"
              class="attachment-item"
            >
              <img
                v-if="file.type === 'image'"
                :src="file.preview"
                :alt="file.name"
                class="attachment-preview-image"
              />
              <div v-else class="attachment-preview-file">
                <span class="file-icon">📎</span>
                <span class="file-name">{{ file.name }}</span>
              </div>
              <button
                @click="removeFile(index)"
                class="remove-attachment"
                type="button"
              >
                ×
              </button>
            </div>
          </div>
          <div class="input-row">
            <button
              @click="triggerFileSelect"
              class="file-select-btn"
              type="button"
              title="选择文件"
            >
              📎
            </button>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted, watch } from 'vue'
import SessionSidebar from '../components/SessionSidebar.vue'
import { useCurrentSession, addMessage, clearCurrentSession, createSession } from '../services/useChatSessions'
import { renderMarkdown } from '../services/useMarkdown'
import { initializeSessions } from '../services/useChatSessions'
import type { Message, MessageAttachment } from '../types/chat'

const currentSession = useCurrentSession()
const inputMessage = ref('')
const isLoading = ref(false)
const isStreaming = ref(false)
const messagesContainer = ref<HTMLElement>()
const selectedFiles = ref<Array<{ path: string; preview: string; name: string; type: 'image' | 'video' | 'file' }>>([])
const attachmentPreviewCache = ref<Record<string, string>>({})
let streamListener: ((event: any, data: any) => void) | null = null

const initMessage = "正在思考..."

const renderMessage = (content: string) => {
  return renderMarkdown(content)
}

const loadAttachmentPreview = async (filePath: string) => {
  if (!attachmentPreviewCache.value[filePath] && window.electronAPI) {
    try {
      const data = await window.electronAPI.file.readAsDataURL(filePath)
      attachmentPreviewCache.value[filePath] = data.preview
    } catch (error) {
      console.error('Error loading attachment preview:', error)
    }
  }
}

const handleImageError = async (event: Event) => {
  const img = event.target as HTMLImageElement
  const filePath = img.dataset.filePath || ''
  if (filePath && window.electronAPI) {
    try {
      const data = await window.electronAPI.file.readAsDataURL(filePath)
      attachmentPreviewCache.value[filePath] = data.preview
      img.src = data.preview
    } catch (error) {
      console.error('Error loading image:', error)
    }
  }
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

const triggerFileSelect = async () => {
  try {
    const result = await window.electronAPI.dialog.showOpenDialog({
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
      ],
      multiple: true
    })

    if (!result.canceled && result.filePaths.length > 0) {
      for (const filePath of result.filePaths) {
        const data = await window.electronAPI.file.readAsDataURL(filePath)
        selectedFiles.value.push(data);
      }
    }
  } catch (error) {
    console.error('Error selecting files:', error)
  }
}

const removeFile = (index: number) => {
  selectedFiles.value.splice(index, 1)
}

const sendMessage = async () => {
  const message = inputMessage.value.trim()
  const hasFiles = selectedFiles.value.length > 0
  
  if ((!message && !hasFiles) || isLoading.value) return

  // 准备文件路径和附件信息
  const filePaths: string[] = selectedFiles.value.map(f => f.path)
  const attachments: MessageAttachment[] = selectedFiles.value.map(f => ({
    type: f.type,
    path: f.path,
    name: f.name
  }))

  addMessage({
    role: 'user',
    content: message || (hasFiles ? `[已上传 ${selectedFiles.value.length} 个文件]` : ''),
    timestamp: Date.now(),
    attachments: attachments.length > 0 ? attachments : undefined
  })

  inputMessage.value = ''
  selectedFiles.value = []
  isLoading.value = true
  isStreaming.value = false
  await scrollToBottom()

  const thinkingMessage: Message = {
    role: 'assistant',
    content: initMessage,
    timestamp: Date.now(),
  }
  addMessage(thinkingMessage)
  isStreaming.value = true

  await new Promise(resolve => setTimeout(resolve, 500))

  try {
    await window.electronAPI.chat.sendMessage(message, filePaths, currentSession.value?.id)
  } catch (error:any) {
    const session = currentSession.value
    if (session && session.messages.length > 0) {
      const lastMessage = session.messages[session.messages.length - 1]
      if (lastMessage.role === 'assistant') {
        lastMessage.content = error.message
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
          if (!session.id){
            session.id = data.sessionId;
          }
          if (data.chunk !== undefined) {
            if (lastMessage.content === initMessage){
              lastMessage.content = data.chunk
            }else{
              lastMessage.content += data.chunk
            }
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

watch(currentSession, async () => {
  scrollToBottom()
  // 预加载消息中的附件预览
  if (currentSession.value?.messages) {
    for (const message of currentSession.value.messages) {
      if (message.attachments) {
        for (const attachment of message.attachments) {
          if (attachment.type === 'image' && !attachmentPreviewCache.value[attachment.path]) {
            await loadAttachmentPreview(attachment.path)
          }
        }
      }
    }
  }
}, { immediate: true })
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

.message-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.message-attachment {
  position: relative;
  display: inline-block;
}

.attachment-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  object-fit: contain;
}

.message.user .attachment-image {
  border-color: rgba(255, 255, 255, 0.3);
}

.attachment-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-primary);
}

.message.user .attachment-file {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
  color: #ffffff;
}

.attachment-file .file-icon {
  font-size: 16px;
}

.attachment-file .file-name {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachments-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.attachment-item {
  position: relative;
  display: inline-block;
}

.attachment-preview-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.attachment-preview-file {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-primary);
}

.file-icon {
  font-size: 16px;
}

.file-name {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-attachment {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  transition: all 0.2s;
}

.remove-attachment:hover {
  background: var(--accent-color);
  color: #ffffff;
  border-color: var(--accent-color);
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.file-select-btn {
  width: 40px;
  height: 48px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  flex-shrink: 0;
}

.file-select-btn:hover {
  background: var(--accent-color);
  color: #ffffff;
  border-color: var(--accent-color);
}

.chat-input {
  flex: 1;
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
