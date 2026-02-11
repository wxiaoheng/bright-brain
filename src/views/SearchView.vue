<template>
  <div class="search-wrapper">
    <KnowledgeSidebar />
    <div class="search-main">
      <div class="search-header">
        <h2>知识搜索</h2>
      </div>

      <div class="search-section">
        <div class="search-input-wrapper">
          <input
            v-model="searchQuery"
            @keydown.enter="executeSearch"
            type="text"
            placeholder="Search for anything..."
            class="search-input"
          />
          <div class="deep-search">
            <label class="switch-label">
              <span class="switch">
                <input
                  v-model="deepSearch"
                  type="checkbox"
                />
                <span class="slider"></span>
              </span>
              <span class="switch-text">深度搜索</span>
            </label>
          </div>
        </div>
      </div>

      <div class="search-results">
        <div v-if="isLoading" class="loading">
          <div class="spinner"></div>
          <p>Searching...</p>
        </div>
        <div v-else-if="results.length === 0 && hasSearched" class="no-results">
          <span class="icon">🔍</span>
          <p>No results found for "{{ searchQuery }}"</p>
        </div>
        <div v-else-if="results.length > 0" class="results-list">
          <div
            v-for="(result, index) in results"
            :key="index"
            class="result-item"
          >
            <div class="result-title">{{ result.name }}</div>
            <div
              class="result-url"
              role="link"
              tabindex="0"
              @click="openResultUrl(result.source)"
              @keydown.enter.prevent="openResultUrl(result.source)"
              @keydown.space.prevent="openResultUrl(result.source)"
            >
              {{ result.source }}
            </div>
            <div class="result-description">{{ result.text }}</div>
          </div>
        </div>
        <div v-else class="placeholder">
          <span class="icon">🔎</span>
          <p>Start by typing a search query above</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import KnowledgeSidebar from '../components/KnowledgeSidebar.vue'

interface SearchResult {
  name: string
  source: string
  text: string
}

const searchQuery = ref('')
const isLoading = ref(false)
const hasSearched = ref(false)
const results = ref<SearchResult[]>([])
let deepSearch = ref(false)

const executeSearch = async () => {
  const query = searchQuery.value.trim()
  if (!query || isLoading.value) return
  isLoading.value = true
  hasSearched.value = true
  try {
    const response = await window.electronAPI.search.execute(query, deepSearch.value)
    if (response.success) results.value = response.results
  } catch (error) {
    console.error('Search error:', error)
  }
  isLoading.value = false
}

const openResultUrl = async (target: string) => {
  const trimmed = (target || '').trim()
  if (!trimmed) return
  try {
    await window.electronAPI.shell.open(trimmed)
  } catch (error) {
    console.error('Open url error:', error)
  }
}
</script>

<style scoped>
.search-wrapper {
  display: flex;
  height: 100%;
  background: var(--bg-primary);
}

.search-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  min-width: 0;
}

.search-header {
  padding: 20px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  transition: background 0.3s, border-color 0.3s;
}

.search-header h2 {
  font-size: 20px;
  color: var(--text-primary);
  font-weight: 600;
  margin: 0;
}

.search-section {
  padding: 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
  transition: background 0.3s, border-color 0.3s;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-input {
  flex: 1;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px 18px;
  color: var(--text-primary);
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s, background 0.3s;
}

.search-input:focus {
  border-color: var(--accent-color);
}

.deep-search {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.switch-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-color);
  transition: 0.4s;
  border-radius: 26px;
}

.slider:before {
  position: absolute;
  content: '';
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

input:checked + .slider {
  background-color: var(--accent-color);
}

input:checked + .slider:before {
  transform: translateX(24px);
}

.switch-text {
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: 16px;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading p {
  color: var(--text-secondary);
  font-size: 14px;
}

.no-results,
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: 16px;
}

.icon {
  font-size: 64px;
  opacity: 0.5;
}

.no-results p,
.placeholder p {
  color: var(--text-secondary);
  font-size: 16px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-item {
  background: var(--bg-secondary);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  transition: all 0.2s, background 0.3s, border-color 0.3s;
}

.result-item:hover {
  border-color: var(--accent-color);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.result-title {
  color: var(--accent-color);
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
  cursor: pointer;
}

.result-title:hover {
  text-decoration: underline;
}

.result-url {
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 8px;
  cursor: pointer;
  text-decoration: underline;
  word-break: break-all;
}

.result-description {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
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
