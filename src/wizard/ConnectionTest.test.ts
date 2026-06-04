// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ConnectionTest from './ConnectionTest.vue'
import type { TestStatus } from './ConnectionTest.vue'

function mk(status: TestStatus, error = '', disabled = false) {
    return mount(ConnectionTest, { props: { disabled, status, error } })
}

describe('ConnectionTest', () => {
    it('shows "Test Connection" button in idle state', () => {
        const wrapper = mk('idle')
        expect(wrapper.find('button').text()).toContain('Test Connection')
    })

    it('disables the button when the disabled prop is true', () => {
        const wrapper = mk('idle', '', true)
        expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    })

    it('disables the button when status is testing', () => {
        const wrapper = mk('testing')
        expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    })

    it('shows a loading spinner and "Testing…" text when status is testing', () => {
        const wrapper = mk('testing')
        expect(wrapper.find('.loading').exists()).toBe(true)
        expect(wrapper.find('button').text()).toContain('Testing…')
    })

    it('shows a success message when status is success', () => {
        const wrapper = mk('success')
        expect(wrapper.find('.text-success').exists()).toBe(true)
        expect(wrapper.text()).toContain('Connection successful')
    })

    it('shows no error alert when status is not error', () => {
        expect(mk('idle').find('.alert-error').exists()).toBe(false)
        expect(mk('testing').find('.alert-error').exists()).toBe(false)
        expect(mk('success').find('.alert-error').exists()).toBe(false)
    })

    it('shows an error alert with the error message when status is error', () => {
        const wrapper = mk('error', 'Access Denied')
        expect(wrapper.find('.alert-error').exists()).toBe(true)
        expect(wrapper.text()).toContain('Access Denied')
    })

    it('emits test event when button is clicked', async () => {
        const wrapper = mk('idle')
        await wrapper.find('button').trigger('click')
        expect(wrapper.emitted('test')).toHaveLength(1)
    })
})
