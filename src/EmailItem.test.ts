// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EmailItem from './EmailItem.vue'

vi.mock('./cache.js', () => ({
    getCachedEmail: vi.fn().mockResolvedValue(null),
    setCachedEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(),
    GetObjectCommand: vi.fn(),
}))

vi.mock('./parser.js', () => ({
    default: vi.fn(),
}))

beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
})

describe('EmailItem error display', () => {
    it('renders an error message when settings are missing', async () => {
        const wrapper = mount(EmailItem, {
            props: { messageId: 'test-id' },
            global: { stubs: { EmailAddress: true } },
        })
        await flushPromises()

        expect(wrapper.text()).toContain('Missing settings')
    })

    it('does not render the email block when there is an error', async () => {
        const wrapper = mount(EmailItem, {
            props: { messageId: 'test-id' },
            global: { stubs: { EmailAddress: true } },
        })
        await flushPromises()

        expect(wrapper.find('h2').exists()).toBe(false)
    })
})
