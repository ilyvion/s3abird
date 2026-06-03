// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from './App.vue'
import { useKeyboardShortcutsModal } from './useKeyboardShortcutsModal.js'

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
    RouterView: { template: '<div />' },
    RouterLink: { template: '<a />' },
}))

vi.mock('./useEffectiveTheme', () => ({
    useEffectiveTheme: () => ({ applyThemeToDocument: vi.fn(), dispose: vi.fn() }),
}))

vi.mock('./MainNavbar.vue', () => ({ default: { template: '<div />' } }))
vi.mock('./MainFooter.vue', () => ({ default: { template: '<div />' } }))
vi.mock('./AwsSettings.vue', () => ({ default: { template: '<div />' } }))
vi.mock('./BucketSelector.vue', () => ({ default: { template: '<div />' } }))
vi.mock('./KeyboardShortcutsModal.vue', () => ({
    default: { template: '<div />', props: ['modelValue'] },
}))

beforeEach(() => {
    setActivePinia(createPinia())
    const { showShortcutsModal } = useKeyboardShortcutsModal()
    showShortcutsModal.value = false
})

afterEach(() => {
    const { showShortcutsModal } = useKeyboardShortcutsModal()
    showShortcutsModal.value = false
})

describe('App ? shortcut', () => {
    it('pressing ? sets showShortcutsModal to true', async () => {
        const { showShortcutsModal } = useKeyboardShortcutsModal()
        expect(showShortcutsModal.value).toBe(false)

        const wrapper = mount(App, {
            global: { stubs: { RouterView: true, 'router-view': true } },
        })
        await flushPromises()

        window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
        await flushPromises()

        expect(showShortcutsModal.value).toBe(true)
        wrapper.unmount()
    })

    it('pressing ? does nothing when an input is focused', async () => {
        const { showShortcutsModal } = useKeyboardShortcutsModal()

        const wrapper = mount(App, {
            global: { stubs: { RouterView: true, 'router-view': true } },
        })
        await flushPromises()

        const input = document.createElement('input')
        document.body.appendChild(input)
        input.focus()

        window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
        await flushPromises()

        expect(showShortcutsModal.value).toBe(false)

        input.remove()
        wrapper.unmount()
    })

    it('pressing ? does nothing when modal is already open', async () => {
        const { showShortcutsModal } = useKeyboardShortcutsModal()
        showShortcutsModal.value = true

        const wrapper = mount(App, {
            global: { stubs: { RouterView: true, 'router-view': true } },
        })
        await flushPromises()

        window.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }))
        await flushPromises()

        expect(showShortcutsModal.value).toBe(true)
        wrapper.unmount()
    })
})
