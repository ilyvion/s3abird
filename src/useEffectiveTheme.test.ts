// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('useEffectiveTheme', () => {
    beforeEach(() => {
        localStorage.clear()
        vi.resetModules()
    })

    function mockMatchMedia(prefersDark: boolean) {
        const listeners: Array<() => void> = []
        const mock = {
            matches: prefersDark,
            addEventListener: vi.fn((_: string, cb: () => void) => listeners.push(cb)),
            removeEventListener: vi.fn(),
        }
        window.matchMedia = vi.fn().mockReturnValue(mock)
        return mock
    }

    it('effectiveTheme returns light when system prefers light and theme is system', async () => {
        mockMatchMedia(false)
        vi.doMock('./stores/theme', () => ({ useThemeStore: () => ({ theme: 'system' }) }))
        const { useEffectiveTheme } = await import('./useEffectiveTheme')
        const { effectiveTheme } = useEffectiveTheme()
        expect(effectiveTheme.value).toBe('light')
    })

    it('effectiveTheme returns dark when system prefers dark and theme is system', async () => {
        mockMatchMedia(true)
        vi.doMock('./stores/theme', () => ({ useThemeStore: () => ({ theme: 'system' }) }))
        const { useEffectiveTheme } = await import('./useEffectiveTheme')
        const { effectiveTheme } = useEffectiveTheme()
        expect(effectiveTheme.value).toBe('dark')
    })

    it('effectiveTheme respects explicit light theme regardless of system preference', async () => {
        mockMatchMedia(true)
        vi.doMock('./stores/theme', () => ({ useThemeStore: () => ({ theme: 'light' }) }))
        const { useEffectiveTheme } = await import('./useEffectiveTheme')
        const { effectiveTheme } = useEffectiveTheme()
        expect(effectiveTheme.value).toBe('light')
    })

    it('effectiveTheme respects explicit dark theme regardless of system preference', async () => {
        mockMatchMedia(false)
        vi.doMock('./stores/theme', () => ({ useThemeStore: () => ({ theme: 'dark' }) }))
        const { useEffectiveTheme } = await import('./useEffectiveTheme')
        const { effectiveTheme } = useEffectiveTheme()
        expect(effectiveTheme.value).toBe('dark')
    })

    it('effectiveThemeName returns latte for light theme', async () => {
        mockMatchMedia(false)
        vi.doMock('./stores/theme', () => ({ useThemeStore: () => ({ theme: 'light' }) }))
        const { useEffectiveTheme } = await import('./useEffectiveTheme')
        const { effectiveThemeName } = useEffectiveTheme()
        expect(effectiveThemeName.value).toBe('latte')
    })

    it('effectiveThemeName returns frappe for dark theme', async () => {
        mockMatchMedia(true)
        vi.doMock('./stores/theme', () => ({ useThemeStore: () => ({ theme: 'system' }) }))
        const { useEffectiveTheme } = await import('./useEffectiveTheme')
        const { effectiveThemeName } = useEffectiveTheme()
        expect(effectiveThemeName.value).toBe('frappe')
    })

    it('registers the media change listener exactly once across multiple useEffectiveTheme calls', async () => {
        const media = mockMatchMedia(false)
        vi.doMock('./stores/theme', () => ({ useThemeStore: () => ({ theme: 'system' }) }))
        const { useEffectiveTheme } = await import('./useEffectiveTheme')
        useEffectiveTheme()
        useEffectiveTheme()
        useEffectiveTheme()
        expect(media.addEventListener).toHaveBeenCalledTimes(1)
    })

    it('dispose() removes the change listener', async () => {
        const media = mockMatchMedia(false)
        vi.doMock('./stores/theme', () => ({ useThemeStore: () => ({ theme: 'system' }) }))
        const { useEffectiveTheme } = await import('./useEffectiveTheme')
        const { dispose } = useEffectiveTheme()
        dispose()
        expect(media.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('dispose() allows the listener to be re-registered on the next useEffectiveTheme call', async () => {
        const media = mockMatchMedia(false)
        vi.doMock('./stores/theme', () => ({ useThemeStore: () => ({ theme: 'system' }) }))
        const { useEffectiveTheme } = await import('./useEffectiveTheme')
        const { dispose } = useEffectiveTheme()
        dispose()
        useEffectiveTheme()
        expect(media.addEventListener).toHaveBeenCalledTimes(2)
    })

    it('applyThemeToDocument sets the data-theme attribute on the document element', async () => {
        mockMatchMedia(false)
        vi.doMock('./stores/theme', () => ({ useThemeStore: () => ({ theme: 'light' }) }))
        const { useEffectiveTheme } = await import('./useEffectiveTheme')
        const { applyThemeToDocument } = useEffectiveTheme()
        applyThemeToDocument()
        expect(document.documentElement.getAttribute('data-theme')).toBe('latte')
    })
})
