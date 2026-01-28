<template>
  <div class="sidebar">
    <nav class="nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
      >
        <span class="icon">{{ item.icon }}</span>
        <span class="label">{{ item.label }}</span>
      </RouterLink>
    </nav>
    <div class="sidebar-footer">
      <div class="status">
        <span class="status-dot"></span>
        <span class="status-text">Online</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { path: '/chat', icon: '💬', label: '聊天' },
  { path: '/search', icon: '🔍', label: '搜索' },
  { path: '/settings', icon: '⚙️', label: '设置' },
]

const isActive = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<style scoped>
.sidebar {
  width: 80px;
  background: var(--bg-secondary);
  display: flex;
  flex-direction: column;
  padding: 16px 0;
  border-right: 1px solid var(--border-color);
  transition: background 0.3s, border-color 0.3s;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 8px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 0;
  border-radius: 12px;
  text-decoration: none;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.nav-item:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-color);
  color: #fff;
}

.icon {
  font-size: 24px;
}

.label {
  font-size: 11px;
  font-weight: 500;
}

.sidebar-footer {
  margin-top: auto;
  padding: 16px;
}

.status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border-radius: 8px;
  background: var(--bg-tertiary);
}

.status-dot {
  width: 8px;
  height: 8px;
  background: var(--success-color);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.status-text {
  font-size: 11px;
  color: var(--text-secondary);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
