// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { version } from '../package.json'
import MainFooter from './MainFooter.vue'
import { useChangelogModal } from './composables/useChangelogModal.js'

describe('MainFooter', () => {
    it('renders the package version', () => {
        const wrapper = mount(MainFooter)
        expect(wrapper.text()).toContain(version)
    })

    it('opens the changelog modal when the version button is clicked', async () => {
        const { showChangelogModal } = useChangelogModal()
        showChangelogModal.value = false
        const wrapper = mount(MainFooter)
        await wrapper.find('button').trigger('click')
        expect(showChangelogModal.value).toBe(true)
    })
})
