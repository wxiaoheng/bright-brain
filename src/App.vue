<template>
  <div class="app" :data-theme="theme">
    <TitleBar />
    <div class="content">
      <SideBar />
      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import TitleBar from './components/TitleBar.vue'
import SideBar from './components/SideBar.vue'
import { useTheme, initializeTheme } from './services/useTheme'

const { theme } = useTheme()

initializeTheme()
</script>

<style scoped>
.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-tertiary) 100%);
  transition: background 0.3s;
}

.content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
