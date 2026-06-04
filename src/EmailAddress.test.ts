// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EmailAddress from './EmailAddress.vue'
import type { Address } from 'postal-mime'

describe('EmailAddress', () => {
    it('renders empty string when no address is provided', () => {
        const wrapper = mount(EmailAddress, { props: {} })
        expect(wrapper.text()).toBe('')
    })

    it('renders name and address when both are present', () => {
        const address: Address = { name: 'Alice', address: 'alice@example.com' }
        const wrapper = mount(EmailAddress, { props: { address } })
        expect(wrapper.text()).toContain('Alice')
        expect(wrapper.text()).toContain('<alice@example.com>')
    })

    it('renders only the angle-bracketed address when name is an empty string', () => {
        const address: Address = { name: '', address: 'bob@example.com' }
        const wrapper = mount(EmailAddress, { props: { address } })
        expect(wrapper.text()).toContain('<bob@example.com>')
        expect(wrapper.text()).not.toContain('undefined')
    })

    it('renders only the name when address is an empty string', () => {
        const address: Address = { name: 'Charlie', address: '' }
        const wrapper = mount(EmailAddress, { props: { address } })
        expect(wrapper.text()).toContain('Charlie')
        expect(wrapper.text()).not.toContain('<')
    })
})
