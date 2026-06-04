// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
    setActivePinia(createPinia())
})

function mockMatchMedia(prefersDark: boolean) {
    window.matchMedia = vi.fn().mockReturnValue({
        matches: prefersDark,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    })
}

describe('useThemeStore', () => {
    it('initializes with system when localStorage is empty', async () => {
        mockMatchMedia(false)
        const { useThemeStore } = await import('./theme')
        const store = useThemeStore()
        expect(store.theme).toBe('system')
    })

    it('initializes from localStorage when a theme is persisted', async () => {
        localStorage.setItem('theme', JSON.stringify('dark'))
        mockMatchMedia(false)
        const { useThemeStore } = await import('./theme')
        const store = useThemeStore()
        expect(store.theme).toBe('dark')
    })

    describe('nextTheme getter', () => {
        it('returns light when current theme is system', async () => {
            mockMatchMedia(false)
            const { useThemeStore } = await import('./theme')
            const store = useThemeStore()
            store.theme = 'system'
            expect(store.nextTheme).toBe('light')
        })

        it('returns dark when current theme is light', async () => {
            mockMatchMedia(false)
            const { useThemeStore } = await import('./theme')
            const store = useThemeStore()
            store.theme = 'light'
            expect(store.nextTheme).toBe('dark')
        })

        it('returns system when current theme is dark', async () => {
            mockMatchMedia(false)
            const { useThemeStore } = await import('./theme')
            const store = useThemeStore()
            store.theme = 'dark'
            expect(store.nextTheme).toBe('system')
        })
    })

    describe('effectiveTheme getter', () => {
        it('returns light when theme is system and system prefers light', async () => {
            mockMatchMedia(false)
            const { useThemeStore } = await import('./theme')
            const store = useThemeStore()
            store.theme = 'system'
            expect(store.effectiveTheme).toBe('light')
        })

        it('returns dark when theme is system and system prefers dark', async () => {
            mockMatchMedia(true)
            const { useThemeStore } = await import('./theme')
            const store = useThemeStore()
            store.theme = 'system'
            expect(store.effectiveTheme).toBe('dark')
        })

        it('returns light when theme is explicitly light regardless of system', async () => {
            mockMatchMedia(true)
            const { useThemeStore } = await import('./theme')
            const store = useThemeStore()
            store.theme = 'light'
            expect(store.effectiveTheme).toBe('light')
        })

        it('returns dark when theme is explicitly dark regardless of system', async () => {
            mockMatchMedia(false)
            const { useThemeStore } = await import('./theme')
            const store = useThemeStore()
            store.theme = 'dark'
            expect(store.effectiveTheme).toBe('dark')
        })
    })

    describe('updateTheme action', () => {
        it('updates theme and persists to localStorage', async () => {
            mockMatchMedia(false)
            const { useThemeStore } = await import('./theme')
            const store = useThemeStore()
            store.updateTheme('dark')
            expect(store.theme).toBe('dark')
            expect(JSON.parse(localStorage.getItem('theme')!)).toBe('dark')
        })

        it('persists light theme to localStorage', async () => {
            mockMatchMedia(false)
            const { useThemeStore } = await import('./theme')
            const store = useThemeStore()
            store.updateTheme('light')
            expect(store.theme).toBe('light')
            expect(JSON.parse(localStorage.getItem('theme')!)).toBe('light')
        })
    })

    describe('cycleTheme action', () => {
        it('cycles from system to light and persists', async () => {
            mockMatchMedia(false)
            const { useThemeStore } = await import('./theme')
            const store = useThemeStore()
            store.theme = 'system'
            store.cycleTheme()
            expect(store.theme).toBe('light')
            expect(JSON.parse(localStorage.getItem('theme')!)).toBe('light')
        })

        it('cycles from light to dark', async () => {
            mockMatchMedia(false)
            const { useThemeStore } = await import('./theme')
            const store = useThemeStore()
            store.theme = 'light'
            store.cycleTheme()
            expect(store.theme).toBe('dark')
        })

        it('cycles from dark back to system', async () => {
            mockMatchMedia(false)
            const { useThemeStore } = await import('./theme')
            const store = useThemeStore()
            store.theme = 'dark'
            store.cycleTheme()
            expect(store.theme).toBe('system')
        })
    })
})
