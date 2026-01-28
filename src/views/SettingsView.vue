<template>
  <div class="settings-container">
    <div class="settings-header">
      <h2>设置</h2>
    </div>

    <div class="settings-content">
      <div class="settings-section">
        <h3>外观设置</h3>
        <div class="setting-item">
          <div class="setting-info">
            <label>主题</label>
            <p class="description">选择应用的主题</p>
          </div>
          <select v-model="settings.theme" @change="saveSettings">
            <option value="light">亮色</option>
            <option value="dark">暗色</option>
          </select>
        </div>
      </div>

      <div class="settings-section">
        <h3>AI对话配置</h3>

        <div class="setting-item">
          <div class="setting-info">
            <label>请求端点</label>
            <p class="description">请求端点BaseUrl,支持openAI、千问、智谱AI等模型</p>
          </div>
          <input
            v-model="settings.baseUrl"
            type="text"
            placeholder="请输入请求端点BaseUrl"
            @blur="saveSettings"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>API Key</label>
            <p class="description">输入你的AI大模型的API key</p>
          </div>
          <input
            v-model="settings.apiKey"
            type="password"
            placeholder="请输入API key"
            @blur="saveSettings"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <label>模型名</label>
            <p class="description">输入你的AI大模型名，如gpt-5.1、glm-4.7</p>
          </div>
           <input
            v-model="settings.model"
            type="text"
            placeholder="请输入模型名"
            @blur="saveSettings"
          />
        </div>
      </div>

      <div class="settings-section">
        <h3>搜索配置</h3>

        <div class="setting-item">
          <div class="setting-info">
            <label>显示结果数</label>
            <p class="description">显示最大搜索结果条数</p>
          </div>
          <select v-model="settings.topN" @change="saveSettings">
            <option :value="3">3</option>
            <option :value="5">5</option>
            <option :value="10">10</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useTheme, setTheme } from '../services/useTheme'

interface Settings {
  theme: string
  baseUrl: string
  apiKey: string
  model: string
  searchVector: string
  topN: number
}

const defaultSettings: Settings = {
  theme: 'light',
  baseUrl: '',
  apiKey: '',
  model: '',
  searchVector: 'google',
  topN: 5,
}

const settings = ref<Settings>({ ...defaultSettings })

const loadSettings = async () => {
  try {
    const response = await window.electronAPI.settings.get()
    if (response.success && response.settings) {
      settings.value = { ...defaultSettings, ...response.settings }
      
      // 同步主题
      if (settings.value.theme) {
        setTheme(settings.value.theme as any)
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
  }
}

const saveSettings = async () => {
  try {
    const settingsToSave = {
      theme: settings.value.theme,
      baseUrl: settings.value.baseUrl,
      apiKey: settings.value.apiKey,
      model: settings.value.model,
      searchVector: settings.value.searchVector,
      topN: settings.value.topN,
    }
    console.log('Settings to save:', settingsToSave)
    const result = await window.electronAPI.settings.save(settingsToSave)
    console.log('Save result:', result)
    
    // 应用主题
    if (settings.value.theme) {
      setTheme(settings.value.theme as any)
    }
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

const resetSettings = () => {
  settings.value = { ...defaultSettings }
  setTheme('light')
  saveSettings()
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  padding: 24px;
  overflow-y: auto;
  transition: background 0.3s;
}

.settings-header {
  margin-bottom: 24px;
}

.settings-header h2 {
  font-size: 24px;
  color: var(--text-primary);
  font-weight: 600;
}

.settings-content {
  max-width: 800px;
}

.settings-section {
  background: var(--bg-secondary);
  padding: 24px;
  border-radius: 16px;
  margin-bottom: 24px;
  border: 1px solid var(--border-color);
  transition: background 0.3s, border-color 0.3s;
}

.settings-section h3 {
  color: var(--accent-color);
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.setting-item:first-child {
  padding-top: 0;
}

.setting-info {
  flex: 1;
}

.setting-info label {
  display: block;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}

.setting-info .description {
  color: var(--text-secondary);
  font-size: 13px;
}

.setting-item input[type="text"],
.setting-item input[type="password"],
.setting-item select {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, background 0.3s;
  min-width: 200px;
}

.setting-item input:focus,
.setting-item select:focus {
  border-color: var(--accent-color);
}

.slider-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
}

.slider-wrapper input[type="range"] {
  flex: 1;
  -webkit-appearance: none;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  outline: none;
}

.slider-wrapper input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: var(--accent-color);
  border-radius: 50%;
  cursor: pointer;
}

.slider-value {
  color: var(--accent-color);
  font-size: 14px;
  font-weight: 600;
  min-width: 32px;
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

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
}

.reset-button,
.save-button {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.reset-button {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.reset-button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.save-button {
  background: var(--accent-color);
  color: white;
}

.save-button:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}
</style>
