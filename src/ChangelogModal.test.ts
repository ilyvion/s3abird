// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ChangelogModal from './ChangelogModal.vue'

vi.mock('./loadChangelog.js', () => ({
    loadChangelog: vi
        .fn()
        .mockResolvedValue(
            '## [1.0.0]\n\n- Initial release\n\n[Keep a Changelog](https://keepachangelog.com/)'
        ),
}))

describe('ChangelogModal', () => {
    it('renders changelog content when opened', async () => {
        const wrapper = mount(ChangelogModal, { props: { modelValue: false } })
        await wrapper.setProps({ modelValue: true })
        await flushPromises()
        expect(wrapper.text()).toContain('Changelog')
        expect(wrapper.text()).toContain('1.0.0')
    })

    it('renders links with target="_blank" and rel="noopener noreferrer"', async () => {
        const wrapper = mount(ChangelogModal, { props: { modelValue: false } })
        await wrapper.setProps({ modelValue: true })
        await flushPromises()
        const link = wrapper.find('a[href="https://keepachangelog.com/"]')
        expect(link.attributes('target')).toBe('_blank')
        expect(link.attributes('rel')).toBe('noopener noreferrer')
    })

    it('does not load content before first open', () => {
        const wrapper = mount(ChangelogModal, { props: { modelValue: false } })
        expect(wrapper.html()).not.toContain('1.0.0')
    })

    it('emits update:modelValue false when close is clicked', async () => {
        const wrapper = mount(ChangelogModal, { props: { modelValue: false } })
        await wrapper.setProps({ modelValue: true })
        await flushPromises()
        await wrapper.find('button.btn').trigger('click')
        expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    })
})
