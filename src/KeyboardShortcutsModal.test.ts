// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import KeyboardShortcutsModal from './KeyboardShortcutsModal.vue'

beforeEach(() => {
    // happy-dom does not implement showModal/close on HTMLDialogElement by default;
    // stub them so watch-driven calls don't throw.
    if (!HTMLDialogElement.prototype.showModal) {
        HTMLDialogElement.prototype.showModal = vi.fn()
    }
    if (!HTMLDialogElement.prototype.close) {
        HTMLDialogElement.prototype.close = vi.fn()
    }
})

describe('KeyboardShortcutsModal v-model wiring', () => {
    it('calls showModal when modelValue becomes true', async () => {
        const wrapper = mount(KeyboardShortcutsModal, { props: { modelValue: false } })
        const dialog = wrapper.find('dialog').element as HTMLDialogElement
        const showModal = vi.spyOn(dialog, 'showModal')

        await wrapper.setProps({ modelValue: true })
        await flushPromises()

        expect(showModal).toHaveBeenCalled()
    })

    it('calls close when modelValue becomes false', async () => {
        const wrapper = mount(KeyboardShortcutsModal, { props: { modelValue: true } })
        const dialog = wrapper.find('dialog').element as HTMLDialogElement
        const close = vi.spyOn(dialog, 'close')

        await wrapper.setProps({ modelValue: false })
        await flushPromises()

        expect(close).toHaveBeenCalled()
    })
})

describe('KeyboardShortcutsModal close paths', () => {
    it('Close button emits update:modelValue with false', async () => {
        const wrapper = mount(KeyboardShortcutsModal, { props: { modelValue: true } })
        await wrapper.find('button.btn').trigger('click')
        expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    })

    it('native dialog close event emits update:modelValue with false', async () => {
        const wrapper = mount(KeyboardShortcutsModal, { props: { modelValue: true } })
        await wrapper.find('dialog').trigger('close')
        expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    })
})
