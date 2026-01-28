import { ref, onMounted } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

const currentTheme = ref<Theme>('light')
const isDark = ref(false)

// 获取系统偏好
const getSystemTheme = (): 'light' | 'dark' => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

// 应用主题
const applyTheme = (theme: Theme) => {
  let effectiveTheme: 'light' | 'dark'

  if (theme === 'system') {
    effectiveTheme = getSystemTheme()
    // 监听系统主题变化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      isDark.value = e.matches
    })
  } else {
    effectiveTheme = theme
    // 移除系统主题监听
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', () => {})
  }

  isDark.value = effectiveTheme === 'dark'
  document.documentElement.setAttribute('data-theme', theme)
}

// 设置主题
export const setTheme = (theme: Theme) => {
  currentTheme.value = theme
  applyTheme(theme)
  
  // 保存到本地存储
  try {
    localStorage.setItem('theme', theme)
  } catch (error) {
    console.error('Failed to save theme:', error)
  }
}

// 获取当前主题
export const useTheme = () => {
  return {
    theme: currentTheme,
    isDark: isDark,
    setTheme,
    toggleTheme: () => {
      setTheme(isDark.value ? 'light' : 'dark')
    },
  }
}

// 初始化主题
export const initializeTheme = () => {
  onMounted(() => {
    // 从本地存储读取主题设置
    const savedTheme = localStorage.getItem('theme') as Theme | null
    
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme)
    } else {
      // 默认使用亮色主题
      setTheme('light')
    }
  })
}

// 导出当前主题（用于在非 setup 中使用）
export const getCurrentTheme = () => currentTheme.value
