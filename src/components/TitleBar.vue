<template>
  <div class="title-bar">
    <div class="title">
      <span class="icon">🧠</span>
      <span>Bright Brain</span>
    </div>
    <div class="window-controls">
      <button @click="handleMinimize" class="control-button minimize">
        −
      </button>
      <button @click="handleMaximize" class="control-button maximize">
        □
      </button>
      <button @click="handleClose" class="control-button close">
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const handleMinimize = async () => {
  try {
    if (window.electronAPI && window.electronAPI.window) {
      await window.electronAPI.window.minimize()
    } else {
      console.error('electronAPI not available')
    }
  } catch (error) {
    console.error('Minimize error:', error)
  }
}

const handleMaximize = async () => {
  try {
    if (window.electronAPI && window.electronAPI.window) {
      await window.electronAPI.window.maximize()
    } else {
      console.error('electronAPI not available')
    }
  } catch (error) {
    console.error('Maximize error:', error)
  }
}

const handleClose = async () => {
  try {
    if (window.electronAPI && window.electronAPI.window) {
      await window.electronAPI.window.close()
    } else {
      console.error('electronAPI not available')
    }
  } catch (error) {
    console.error('Close error:', error)
  }
}
</script>

<style scoped>
.title-bar {
  height: 32px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  -webkit-app-region: drag;
  user-select: none;
  transition: background 0.3s, border-color 0.3s;
}

.title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--accent-color);
}

.icon {
  font-size: 16px;
}

.window-controls {
  display: flex;
  gap: 8px;
  -webkit-app-region: no-drag;
}

.control-button {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #ffffff;
  font-weight: bold;
  transition: all 0.2s;
  cursor: pointer;
  line-height: 1;
}

.control-button:hover {
  transform: scale(1.1);
}

.control-button.minimize {
  background: var(--warning-color);
}

.control-button.maximize {
  background: var(--success-color);
}

.control-button.close {
  background: var(--error-color);
}
</style>
