// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ThreadView from './ThreadView.vue'
import { useEmailStore } from './stores/email.js'
import { applyFormattedDate } from './parser.js'
import type { EmailMeta } from './parser.js'

const mockRouterBack = vi.fn()

vi.mock('vue-router', () => ({
    useRouter: () => ({ back: mockRouterBack }),
}))

vi.mock('./cache.js', () => ({
    getCachedEmail: vi.fn().mockResolvedValue(undefined),
    setCachedEmail: vi.fn().mockResolvedValue(undefined),
    markAsRead: vi.fn().mockResolvedValue(undefined),
}))

const mockLoadEmails = vi.fn().mockResolvedValue(undefined)
const mockLoading = ref(false)

vi.mock('./composables/useInboxLoader.js', () => ({
    useInboxLoader: vi.fn(() => ({
        loading: mockLoading,
        error: ref(null),
        loadEmails: mockLoadEmails,
    })),
}))

function makeMeta(overrides: Partial<EmailMeta> & { key: string }): EmailMeta {
    return applyFormattedDate({
        textPreview: '',
        subject: 'Test subject',
        date: '2024-01-01T10:00:00Z',
        ...overrides,
    })
}

beforeEach(() => {
    setActivePinia(createPinia())
    mockRouterBack.mockClear()
    mockLoadEmails.mockClear()
    mockLoading.value = false
})

describe('ThreadView', () => {
    it('shows "Thread not found" when the threadId does not match any thread', async () => {
        const wrapper = mount(ThreadView, {
            props: { threadId: 'nonexistent' },
            global: { stubs: { ThreadEmailCard: true } },
        })
        await flushPromises()
        expect(wrapper.text()).toContain('Thread not found')
    })

    it('renders one ThreadEmailCard per email in the thread', async () => {
        const emailStore = useEmailStore()

        const root = makeMeta({ key: 'msg-1', messageId: '<root@example.com>' })
        const reply = makeMeta({
            key: 'msg-2',
            messageId: '<reply@example.com>',
            inReplyTo: '<root@example.com>',
            date: '2024-01-01T11:00:00Z',
        })
        emailStore.setEmailMetas([root, reply])

        const wrapper = mount(ThreadView, {
            props: { threadId: '<root@example.com>' },
            global: { stubs: { ThreadEmailCard: true } },
        })
        await flushPromises()

        expect(wrapper.findAllComponents({ name: 'ThreadEmailCard' })).toHaveLength(2)
    })

    it('displays the thread subject from the first email', async () => {
        const emailStore = useEmailStore()
        emailStore.setEmailMetas([
            makeMeta({ key: 'msg-1', messageId: '<root@example.com>', subject: 'My thread' }),
        ])

        const wrapper = mount(ThreadView, {
            props: { threadId: '<root@example.com>' },
            global: { stubs: { ThreadEmailCard: true } },
        })
        await flushPromises()

        expect(wrapper.text()).toContain('My thread')
    })

    it('calls loadEmails on mount', async () => {
        const wrapper = mount(ThreadView, {
            props: { threadId: 'nonexistent' },
            global: { stubs: { ThreadEmailCard: true } },
        })
        await flushPromises()
        expect(mockLoadEmails).toHaveBeenCalled()
        wrapper.unmount()
    })

    it('shows loading message while emails are loading and thread is not yet found', async () => {
        mockLoading.value = true
        const wrapper = mount(ThreadView, {
            props: { threadId: 'nonexistent' },
            global: { stubs: { ThreadEmailCard: true } },
        })
        await flushPromises()
        expect(wrapper.text()).toContain('Loading emails')
        expect(wrapper.text()).not.toContain('Thread not found')
        wrapper.unmount()
    })

    it('pressing Escape navigates back', async () => {
        const emailStore = useEmailStore()
        emailStore.setEmailMetas([makeMeta({ key: 'msg-1', messageId: '<root@example.com>' })])

        const wrapper = mount(ThreadView, {
            props: { threadId: '<root@example.com>' },
            global: { stubs: { ThreadEmailCard: true } },
        })
        await flushPromises()

        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
        await flushPromises()

        expect(mockRouterBack).toHaveBeenCalled()
        wrapper.unmount()
    })
})
