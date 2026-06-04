// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import ThemeController from './ThemeController.vue'
import { useThemeStore } from './stores/theme'

const mockEffectiveTheme = ref<'light' | 'dark'>('light')

vi.mock('./useEffectiveTheme', () => ({
    useEffectiveTheme: () => ({ effectiveTheme: mockEffectiveTheme }),
}))

beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    mockEffectiveTheme.value = 'light'
})

describe('ThemeController button actions', () => {
    it('clicking sun button calls updateTheme("light")', async () => {
        const wrapper = mount(ThemeController)
        const themeStore = useThemeStore()
        vi.spyOn(themeStore, 'updateTheme')

        await wrapper.find('button[aria-label="Set light theme"]').trigger('click')
        expect(themeStore.updateTheme).toHaveBeenCalledWith('light')
    })

    it('clicking moon button calls updateTheme("dark")', async () => {
        const wrapper = mount(ThemeController)
        const themeStore = useThemeStore()
        vi.spyOn(themeStore, 'updateTheme')

        await wrapper.find('button[aria-label="Set dark theme"]').trigger('click')
        expect(themeStore.updateTheme).toHaveBeenCalledWith('dark')
    })

    it('changing the toggle calls cycleTheme', async () => {
        const wrapper = mount(ThemeController)
        const themeStore = useThemeStore()
        vi.spyOn(themeStore, 'cycleTheme')

        await wrapper.find('input[type="checkbox"]').trigger('change')
        expect(themeStore.cycleTheme).toHaveBeenCalled()
    })
})

describe('ThemeController highlight classes', () => {
    it('sun button has highlight class when effectiveTheme is light', async () => {
        mockEffectiveTheme.value = 'light'
        const wrapper = mount(ThemeController)
        await flushPromises()
        expect(wrapper.find('button[aria-label="Set light theme"]').classes()).toContain(
            'text-yellow-500'
        )
    })

    it('sun button does not have highlight class when effectiveTheme is dark', async () => {
        mockEffectiveTheme.value = 'dark'
        const wrapper = mount(ThemeController)
        await flushPromises()
        expect(wrapper.find('button[aria-label="Set light theme"]').classes()).not.toContain(
            'text-yellow-500'
        )
    })

    it('moon button has highlight class when effectiveTheme is dark', async () => {
        mockEffectiveTheme.value = 'dark'
        const wrapper = mount(ThemeController)
        await flushPromises()
        expect(wrapper.find('button[aria-label="Set dark theme"]').classes()).toContain(
            'text-cyan-700'
        )
    })

    it('moon button does not have highlight class when effectiveTheme is light', async () => {
        mockEffectiveTheme.value = 'light'
        const wrapper = mount(ThemeController)
        await flushPromises()
        expect(wrapper.find('button[aria-label="Set dark theme"]').classes()).not.toContain(
            'text-cyan-700'
        )
    })
})
