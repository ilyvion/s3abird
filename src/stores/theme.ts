import { defineStore } from 'pinia'
import { getItem as lsGetItem, setItem as lsSetItem } from '../localStorage'

export type Theme = 'system' | 'light' | 'dark'
export type ThemeName = 'latte' | 'frappe'

const themeOrder: Theme[] = ['system', 'light', 'dark']

export const useThemeStore = defineStore('theme', {
    state: () => ({
        theme: loadTheme() ?? 'system',
    }),
    getters: {
        nextTheme(state) {
            const order = ['system', 'light', 'dark'] as const
            const currentIndex = order.indexOf(state.theme)
            return order[(currentIndex + 1) % order.length]
        },
        effectiveTheme(state) {
            switch (state.theme) {
                case 'system':
                    return window.matchMedia('(prefers-color-scheme: dark)').matches
                        ? 'dark'
                        : 'light'

                default:
                    return state.theme
            }
        },
    },
    actions: {
        updateTheme(newTheme: Theme) {
            this.theme = newTheme
            persistTheme(newTheme)
        },
        cycleTheme() {
            const currentIndex = themeOrder.indexOf(this.theme)
            const nextIndex = (currentIndex + 1) % themeOrder.length
            this.theme = themeOrder[nextIndex]
            persistTheme(this.theme)
        },
    },
})

function persistTheme(theme: Theme) {
    lsSetItem('theme', JSON.stringify(theme))
}

function loadTheme(): Theme | null {
    const v = lsGetItem('theme')
    return v ? JSON.parse(v) : null
}
