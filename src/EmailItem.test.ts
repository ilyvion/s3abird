// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EmailItem from './EmailItem.vue'
import type { ParsedEmail } from './parser.js'
import * as cacheModule from './cache.js'

vi.mock('./cache.js', () => ({
    getCachedEmail: vi.fn().mockResolvedValue(undefined),
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
    vi.mocked(cacheModule.getCachedEmail).mockResolvedValue(undefined)
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

describe('EmailItem headers computed', () => {
    const messageId = btoa('us-east-1|my-bucket|test.eml')

    beforeEach(() => {
        localStorage.config = JSON.stringify({
            credentials: [
                {
                    aws_access_key_id: 'AKID',
                    aws_secret_access_key: 'SECRET',
                    buckets: [{ aws_region: 'us-east-1', bucket: 'my-bucket' }],
                },
            ],
        })
    })

    it('sorts headers alphabetically without mutating the stored array', async () => {
        const originalHeaders = [
            { key: 'subject', originalKey: 'Subject', value: 'Hello' },
            { key: 'date', originalKey: 'Date', value: '2024-01-01' },
            { key: 'from', originalKey: 'From', value: 'a@b.com' },
        ]
        const email: Partial<ParsedEmail> = {
            subject: 'Test',
            headers: [...originalHeaders],
            textAsHtml: '<p>body</p>',
            key: messageId,
        }
        vi.mocked(cacheModule.getCachedEmail).mockResolvedValue(email as ParsedEmail)

        const wrapper = mount(EmailItem, {
            props: { messageId },
            global: { stubs: { EmailAddress: true } },
        })
        await flushPromises()

        // Rendered headers should be in sorted order
        const renderedKeys = wrapper.findAll('dt').map((dt) => dt.text().replace(':', ''))
        expect(renderedKeys).toEqual(['date', 'from', 'subject'])

        // Original array must not be mutated
        expect(email.headers!.map((h) => h.key)).toEqual(['subject', 'date', 'from'])
    })
})
