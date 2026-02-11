<template>
  <div class="knowledge-sidebar">
    <div class="sidebar-header">
      <h3>知识管理</h3>
      <div class="add-dropdown" ref="addDropdownRef">
        <button type="button" class="new-knowledge-btn" @click="toggleAddDropdown" title="新增知识">
          <span>+</span>
          <span class="dropdown-arrow">▾</span>
        </button>
        <div v-if="addDropdownOpen" class="dropdown-menu">
          <button type="button" class="dropdown-item" @click="onAddFile">选择文件</button>
          <button type="button" class="dropdown-item" @click="openUrlModal">添加 URL</button>
        </div>
      </div>
    </div>

    <div class="knowledge-groups">
      <div v-if="knowledgeLoading" class="knowledge-loading">加载中...</div>
      <template v-else>
        <div v-if="grouped.file.length" class="group">
          <div class="group-title">文件</div>
          <div
            v-for="item in grouped.file"
            :key="item.id"
            class="knowledge-item"
          >
            <span class="item-label" :title="item.source">{{ item.name || item.source }}</span>
            <button type="button" class="delete-btn" @click.stop="removeItem(item.id)" title="移除">×</button>
          </div>
        </div>
        <div v-if="grouped.directory.length" class="group">
          <div class="group-title">目录</div>
          <div
            v-for="item in grouped.directory"
            :key="item.id"
            class="knowledge-item"
          >
            <span class="item-label" :title="item.source">{{ item.name || item.source }}</span>
            <button type="button" class="delete-btn" @click.stop="removeItem(item.id)" title="移除">×</button>
          </div>
        </div>
        <div v-if="grouped.url.length" class="group">
          <div class="group-title">URL</div>
          <div
            v-for="item in grouped.url"
            :key="item.id"
            class="knowledge-item"
          >
            <span class="item-label" :title="item.source">{{ item.name || item.source }}</span>
            <button type="button" class="delete-btn" @click.stop="removeItem(item.id)" title="移除">×</button>
          </div>
        </div>
        <div v-if="!knowledgeLoading && knowledgeList.length === 0" class="knowledge-empty">
          暂无知识源，点击上方 + 添加
        </div>
      </template>
    </div>

    <!-- URL 输入弹层 -->
    <div v-if="showUrlModal" class="modal-overlay" @click.self="closeUrlModal">
      <div class="modal-box">
        <div class="modal-header">
          <h3>添加 URL</h3>
          <button type="button" class="modal-close" @click="closeUrlModal">×</button>
        </div>
        <div class="modal-body">
          <input
            ref="urlInputRef"
            v-model="urlInput"
            type="text"
            placeholder="输入 URL 地址"
            class="url-input"
            @keydown.enter="submitUrl"
          />
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="closeUrlModal">取消</button>
          <button type="button" class="btn-primary" @click="submitUrl">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { KnowledgeSourceItem } from '../types/electron'

const knowledgeList = ref<KnowledgeSourceItem[]>([])
const knowledgeLoading = ref(false)
const addDropdownOpen = ref(false)
const addDropdownRef = ref<HTMLElement>()
const showUrlModal = ref(false)
const urlInput = ref('')
const urlInputRef = ref<HTMLInputElement>()

const grouped = computed(() => {
  const list = knowledgeList.value
  const file: KnowledgeSourceItem[] = []
  const directory: KnowledgeSourceItem[] = []
  const url: KnowledgeSourceItem[] = []
  for (const item of list) {
    if (item.type === 'file') file.push(item)
    else if (item.type === 'directory') directory.push(item)
    else url.push(item)
  }
  return { file, directory, url }
})

function toggleAddDropdown() {
  addDropdownOpen.value = !addDropdownOpen.value
}

function closeAddDropdown() {
  addDropdownOpen.value = false
}

function openUrlModal() {
  closeAddDropdown()
  urlInput.value = ''
  showUrlModal.value = true
  setTimeout(() => urlInputRef.value?.focus(), 50)
}

function closeUrlModal() {
  showUrlModal.value = false
}

async function findFileOrUrlId(type: 'file' | 'url', source: string): Promise<string|undefined> {
  // Check if the source already exists in the knowledgeList.
  const data = knowledgeList.value.find(item => item.type === type && item.source === source);
  return data?.id;
}

async function submitUrl() {
  const url = urlInput.value.trim()
  if (!url) return
  const id = await findFileOrUrlId('url', url)

  if (id) {
    const confirmReAdd = window.confirm(`当前网址已添加，是否重新添加？`)
    if (!confirmReAdd) return
  }
  await window.electronAPI.knowledge.add({ type: 'url', source: url, name: url , id})
  closeUrlModal()
  await loadKnowledgeList()
}

function handleClickOutside(e: MouseEvent) {
  if (addDropdownOpen.value && addDropdownRef.value && !addDropdownRef.value.contains(e.target as Node)) {
    closeAddDropdown()
  }
}

async function loadKnowledgeList() {
  knowledgeLoading.value = true
  try {
    const res = await window.electronAPI.knowledge.list()
    if (res.success) knowledgeList.value = res.items
  } catch (e) {
    console.error('Load knowledge list error:', e)
  }
  knowledgeLoading.value = false
}

async function onAddFile() {
  closeAddDropdown()
  const res = await window.electronAPI.dialog.showOpenDialog({
    multiple: true,
    filters: [
      { name: 'files', extensions: ['md', 'doc', 'docx', 'pdf', 'xls', 'xlsx', 'csv'] }
    ]
  })
  if (res.canceled || !res.filePaths.length) return

  for (const p of res.filePaths) {
    const name = p.split(/[/\\]/).pop() || p;
    const id = await findFileOrUrlId('file', p)

    if (id) {
      const confirmReAdd = window.confirm(`当前文件${name}已添加，是否重新添加？`)
      if (!confirmReAdd) continue
    }
    await window.electronAPI.knowledge.add({ type: 'file', source: p, name, id })
  }
  await loadKnowledgeList()
}

async function onAddDirectory() {
  closeAddDropdown()
  const res = await window.electronAPI.dialog.showOpenDialog({ directory: true })
  if (res.canceled || !res.filePaths.length) return
  const p = res.filePaths[0]
  await window.electronAPI.knowledge.add({ type: 'directory', source: p, name: p.split(/[/\\]/).pop() || p })
  await loadKnowledgeList()
}

async function removeItem(id: string) {
  await window.electronAPI.knowledge.remove(id)
  await loadKnowledgeList()
}

onMounted(() => {
  loadKnowledgeList()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.knowledge-sidebar {
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

.add-dropdown {
  position: relative;
}

.new-knowledge-btn {
  width: 32px;
  height: 32px;
  background: var(--accent-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  transition: all 0.2s;
}

.new-knowledge-btn:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.dropdown-arrow {
  font-size: 12px;
  opacity: 0.9;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 140px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  padding: 6px 0;
  z-index: 100;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  color: var(--text-primary);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover {
  background: var(--bg-tertiary);
}

.knowledge-groups {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.knowledge-loading,
.knowledge-empty {
  color: var(--text-secondary);
  font-size: 14px;
  padding: 16px;
  text-align: center;
}

.group {
  margin-bottom: 16px;
}

.group:last-child {
  margin-bottom: 0;
}

.group-title {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding: 0 4px;
}

.knowledge-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  margin-bottom: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: default;
  transition: all 0.2s, background 0.3s, border-color 0.3s;
}

.knowledge-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--border-color-hover);
}

.knowledge-item:hover .delete-btn {
  opacity: 1;
}

.item-label {
  flex: 1;
  min-width: 0;
  color: var(--text-primary);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: var(--error-color);
  color: white;
}

/* URL 弹层 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  width: 90%;
  max-width: 420px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
  font-weight: 600;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.2s, color 0.2s;
}

.modal-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
}

.modal-body .url-input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}

.modal-body .url-input:focus {
  border-color: var(--accent-color);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.btn-secondary {
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.btn-secondary:hover {
  border-color: var(--border-color-hover);
  background: var(--border-color);
}

.btn-primary {
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: var(--accent-color);
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: var(--accent-hover);
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
