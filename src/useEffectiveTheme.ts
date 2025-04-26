import { ref, computed, watch } from 'vue'
import { useThemeStore, type Theme, type ThemeName } from './stores/theme'

const systemPrefersDark = ref(false)
let isInitialized = false

const effectiveTheme = computed<Exclude<Theme, 'system'>>(() => {
    const theme = useThemeStore().theme
    if (theme === 'system') return systemPrefersDark.value ? 'dark' : 'light'
    return theme
})

const effectiveThemeName = computed<ThemeName>(() => {
    if (effectiveTheme.value === 'dark') return 'frappe'
    return 'latte'
})

function setupSystemThemeListener() {
    if (isInitialized || typeof window === 'undefined') return

    isInitialized = true

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => (systemPrefersDark.value = media.matches)

    update()
    media.addEventListener('change', update)

    // ❌ DON'T do this — it ties cleanup to just one component
    // onBeforeUnmount(() => media.removeEventListener('change', update))
}

export function useEffectiveTheme() {
    setupSystemThemeListener()

    return {
        systemPrefersDark,
        effectiveTheme,
        effectiveThemeName,
        applyThemeToDocument: () => {
            watch(
                effectiveThemeName,
                (theme) => {
                    document.documentElement.setAttribute('data-theme', theme)
                },
                { immediate: true }
            )
        },
    }
}
