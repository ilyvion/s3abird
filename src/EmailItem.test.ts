// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EmailItem from './EmailItem.vue'
import type { ParsedEmail } from './parser.js'
import * as cacheModule from './cache.js'
import { useKeyboardShortcutsModal } from './useKeyboardShortcutsModal.js'

const mockRouterPush = vi.fn()

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('./cache.js', () => ({
    getCachedEmail: vi.fn().mockResolvedValue(undefined),
    setCachedEmail: vi.fn().mockResolvedValue(undefined),
    markAsRead: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(),
    GetObjectCommand: vi.fn(),
}))

vi.mock('./parser.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./parser.js')>()
    return { ...actual, default: vi.fn() }
})

beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    mockRouterPush.mockClear()
    vi.mocked(cacheModule.getCachedEmail).mockResolvedValue(undefined)
    const { showShortcutsModal } = useKeyboardShortcutsModal()
    showShortcutsModal.value = false
})

afterEach(() => {
    const { showShortcutsModal } = useKeyboardShortcutsModal()
    showShortcutsModal.value = false
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

describe('EmailItem attachments section', () => {
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

    const makeAttachment = (overrides: object = {}) => ({
        content: 'aGVsbG8=',
        mimeType: 'application/pdf',
        filename: 'doc.pdf',
        disposition: 'attachment' as const,
        encoding: 'base64' as const,
        ...overrides,
    })

    it('renders the attachments section when non-inline attachments are present', async () => {
        const email: Partial<ParsedEmail> = {
            subject: 'Test',
            textAsHtml: '<p>body</p>',
            key: messageId,
            attachments: [makeAttachment()],
        }
        vi.mocked(cacheModule.getCachedEmail).mockResolvedValue(email as ParsedEmail)

        const wrapper = mount(EmailItem, {
            props: { messageId },
            global: { stubs: { EmailAddress: true } },
        })
        await flushPromises()

        expect(wrapper.text()).toContain('Attachments')
        expect(wrapper.text()).toContain('doc.pdf')
        expect(wrapper.text()).toContain('application/pdf')
        expect(wrapper.find('button').text()).toContain('Download')
    })

    it('falls back to attachment-N filename when filename is absent', async () => {
        const email: Partial<ParsedEmail> = {
            subject: 'Test',
            textAsHtml: '<p>body</p>',
            key: messageId,
            attachments: [makeAttachment({ filename: null })],
        }
        vi.mocked(cacheModule.getCachedEmail).mockResolvedValue(email as ParsedEmail)

        const wrapper = mount(EmailItem, {
            props: { messageId },
            global: { stubs: { EmailAddress: true } },
        })
        await flushPromises()

        expect(wrapper.text()).toContain('attachment-1')
    })

    it('hides the attachments section when all attachments are inline', async () => {
        const email: Partial<ParsedEmail> = {
            subject: 'Test',
            html: '<img src="cid:img001@test">',
            textAsHtml: '',
            key: messageId,
            attachments: [
                makeAttachment({
                    contentId: '<img001@test>',
                    mimeType: 'image/png',
                    filename: null,
                }),
            ],
        }
        vi.mocked(cacheModule.getCachedEmail).mockResolvedValue(email as ParsedEmail)

        const wrapper = mount(EmailItem, {
            props: { messageId },
            global: { stubs: { EmailAddress: true } },
        })
        await flushPromises()

        expect(wrapper.text()).not.toContain('Attachments')
    })

    it('shows only non-inline attachments when the email has a mix', async () => {
        const email: Partial<ParsedEmail> = {
            subject: 'Test',
            html: '<img src="cid:img001@test"><p>body</p>',
            textAsHtml: '',
            key: messageId,
            attachments: [
                makeAttachment({
                    contentId: '<img001@test>',
                    mimeType: 'image/png',
                    filename: null,
                }),
                makeAttachment({ filename: 'report.pdf' }),
            ],
        }
        vi.mocked(cacheModule.getCachedEmail).mockResolvedValue(email as ParsedEmail)

        const wrapper = mount(EmailItem, {
            props: { messageId },
            global: { stubs: { EmailAddress: true } },
        })
        await flushPromises()

        expect(wrapper.text()).toContain('Attachments')
        expect(wrapper.text()).toContain('report.pdf')
        expect(wrapper.text()).not.toContain('image/png')
    })

    it('hides the attachments section when there are no attachments', async () => {
        const email: Partial<ParsedEmail> = {
            subject: 'Test',
            textAsHtml: '<p>body</p>',
            key: messageId,
            attachments: [],
        }
        vi.mocked(cacheModule.getCachedEmail).mockResolvedValue(email as ParsedEmail)

        const wrapper = mount(EmailItem, {
            props: { messageId },
            global: { stubs: { EmailAddress: true } },
        })
        await flushPromises()

        expect(wrapper.text()).not.toContain('Attachments')
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
            attachments: [],
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

describe('EmailItem keyboard back navigation', () => {
    it('pressing Escape navigates back to /inbox', async () => {
        const wrapper = mount(EmailItem, {
            props: { messageId: 'test-id' },
            global: { stubs: { EmailAddress: true } },
        })
        await flushPromises()

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await flushPromises()

        expect(mockRouterPush).toHaveBeenCalledWith('/inbox')
        wrapper.unmount()
    })

    it('pressing u navigates back to /inbox', async () => {
        const wrapper = mount(EmailItem, {
            props: { messageId: 'test-id' },
            global: { stubs: { EmailAddress: true } },
        })
        await flushPromises()

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'u', bubbles: true }))
        await flushPromises()

        expect(mockRouterPush).toHaveBeenCalledWith('/inbox')
        wrapper.unmount()
    })

    it('Escape does not navigate back when shortcuts modal is open', async () => {
        const { showShortcutsModal } = useKeyboardShortcutsModal()
        showShortcutsModal.value = true

        const wrapper = mount(EmailItem, {
            props: { messageId: 'test-id' },
            global: { stubs: { EmailAddress: true } },
        })
        await flushPromises()

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await flushPromises()

        expect(mockRouterPush).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('navigation shortcuts are suppressed when an input is focused', async () => {
        const wrapper = mount(EmailItem, {
            props: { messageId: 'test-id' },
            global: { stubs: { EmailAddress: true } },
        })
        await flushPromises()

        const input = document.createElement('input')
        document.body.appendChild(input)
        input.focus()

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await flushPromises()

        expect(mockRouterPush).not.toHaveBeenCalled()

        input.remove()
        wrapper.unmount()
    })
})
