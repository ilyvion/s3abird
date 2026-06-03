// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EmailList from './EmailList.vue'
import { useEmailStore } from './stores/email.js'
import type { EmailMeta } from './parser.js'
import { useKeyboardShortcutsModal } from './useKeyboardShortcutsModal.js'

const mockRouterPush = vi.fn()

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('./cache.js', () => ({
    getCachedEmail: vi.fn().mockResolvedValue(null),
    setCachedEmail: vi.fn().mockResolvedValue(undefined),
    setEmailMeta: vi.fn().mockResolvedValue(undefined),
    getAllEmailMetas: vi.fn().mockResolvedValue([]),
    evictStaleEntries: vi.fn().mockResolvedValue(undefined),
    getReadKeys: vi.fn().mockResolvedValue(new Set<string>()),
    markAsRead: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(),
    ListObjectsV2Command: vi.fn(),
    GetObjectCommand: vi.fn(),
}))

vi.mock('./parser.js', () => ({
    default: vi.fn(),
}))

const invalidBucketConfig = JSON.stringify({
    credentials: [
        {
            aws_access_key_id: '',
            aws_secret_access_key: '',
            buckets: [{ aws_region: '', bucket: '' }],
        },
    ],
})

function makeMeta(key: string): EmailMeta {
    return { key, textPreview: 'preview', formattedDate: '2026-01-01' }
}

function fireKeydown(key: string) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    mockRouterPush.mockClear()
    const { showShortcutsModal } = useKeyboardShortcutsModal()
    showShortcutsModal.value = false
})

afterEach(() => {
    const { showShortcutsModal } = useKeyboardShortcutsModal()
    showShortcutsModal.value = false
})

describe('EmailList validation error handling', () => {
    it('shows an error when bucket config fails validation', async () => {
        localStorage.setItem('config', invalidBucketConfig)

        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        expect(wrapper.find('.alert-error').exists()).toBe(true)
        expect(wrapper.text()).toContain('Missing AWS region in settings')
    })
})

describe('EmailList row interaction', () => {
    it('clicking a row calls markRead with the correct key', async () => {
        const store = useEmailStore()
        const meta: EmailMeta = { key: 'ca', textPreview: 'preview', formattedDate: '2026-01-01' }
        store.setS3Index([{ s3Key: 'emails/test.eml', cacheKey: 'ca' }])
        store.setEmailMetas([meta])

        const markReadSpy = vi.spyOn(store, 'markRead').mockResolvedValue()

        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        await wrapper.find('tbody tr').trigger('click')

        expect(markReadSpy).toHaveBeenCalledWith('ca')
    })
})

describe('EmailList read/unread icons', () => {
    it('shows fa-envelope icon for an unread email', async () => {
        const store = useEmailStore()
        store.setS3Index([{ s3Key: 'emails/test.eml', cacheKey: 'ca' }])
        store.setEmailMetas([{ key: 'ca', textPreview: '', formattedDate: '' }])

        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const icon = wrapper.find('tbody tr i')
        expect(icon.classes()).toContain('fa-envelope')
        expect(icon.classes()).not.toContain('fa-envelope-open')
        expect(icon.attributes('aria-label')).toBe('Unread')
    })

    it('shows fa-envelope-open icon for a read email', async () => {
        const store = useEmailStore()
        store.setS3Index([{ s3Key: 'emails/test.eml', cacheKey: 'ca' }])
        store.setEmailMetas([{ key: 'ca', textPreview: '', formattedDate: '' }])
        store.setReadKeys(new Set(['ca']))

        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const icon = wrapper.find('tbody tr i')
        expect(icon.classes()).toContain('fa-envelope-open')
        expect(icon.classes()).not.toContain('fa-envelope')
        expect(icon.attributes('aria-label')).toBe('Read')
    })
})

describe('EmailList keyboard navigation', () => {
    function setupStore(keys: string[]) {
        const store = useEmailStore()
        store.setS3Index(keys.map((k) => ({ s3Key: `emails/${k}.eml`, cacheKey: k })))
        store.setEmailMetas(keys.map(makeMeta))
        return store
    }

    it('pressing j advances selectedIndex', async () => {
        setupStore(['a', 'b', 'c'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const rows = wrapper.findAll('tbody tr')
        expect(rows[0].classes()).toContain('active')

        fireKeydown('j')
        await flushPromises()

        expect(rows[1].classes()).toContain('active')
        expect(rows[0].classes()).not.toContain('active')
    })

    it('pressing k decrements selectedIndex', async () => {
        setupStore(['a', 'b', 'c'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        fireKeydown('j')
        await flushPromises()
        fireKeydown('j')
        await flushPromises()

        const rows = wrapper.findAll('tbody tr')
        expect(rows[2].classes()).toContain('active')

        fireKeydown('k')
        await flushPromises()

        expect(rows[1].classes()).toContain('active')
    })

    it('j clamps at the last row', async () => {
        setupStore(['a', 'b'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        fireKeydown('j')
        await flushPromises()
        fireKeydown('j')
        await flushPromises()

        const rows = wrapper.findAll('tbody tr')
        expect(rows[1].classes()).toContain('active')
    })

    it('k clamps at the first row', async () => {
        setupStore(['a', 'b'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        fireKeydown('k')
        await flushPromises()

        const rows = wrapper.findAll('tbody tr')
        expect(rows[0].classes()).toContain('active')
    })

    it('ArrowDown and ArrowUp also move selection', async () => {
        setupStore(['a', 'b'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        fireKeydown('ArrowDown')
        await flushPromises()

        const rows = wrapper.findAll('tbody tr')
        expect(rows[1].classes()).toContain('active')

        fireKeydown('ArrowUp')
        await flushPromises()

        expect(rows[0].classes()).toContain('active')
    })

    it('pressing Enter on a selected row calls router.push with correct path', async () => {
        setupStore(['mykey'])
        const store = useEmailStore()
        vi.spyOn(store, 'markRead').mockResolvedValue()

        mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        fireKeydown('Enter')
        await flushPromises()

        expect(mockRouterPush).toHaveBeenCalledWith({ path: '/inbox/mykey' })
    })

    it('keyboard shortcuts are suppressed when an input is focused', async () => {
        setupStore(['a', 'b'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const input = document.createElement('input')
        document.body.appendChild(input)
        input.focus()

        fireKeydown('j')
        await flushPromises()

        const rows = wrapper.findAll('tbody tr')
        expect(rows[0].classes()).toContain('active')
        expect(rows[1].classes()).not.toContain('active')

        input.remove()
    })

    it('keyboard shortcuts are suppressed when the shortcuts modal is open', async () => {
        setupStore(['a', 'b'])
        const { showShortcutsModal } = useKeyboardShortcutsModal()
        showShortcutsModal.value = true

        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        fireKeydown('j')
        await flushPromises()

        const rows = wrapper.findAll('tbody tr')
        expect(rows[0].classes()).toContain('active')
        expect(rows[1].classes()).not.toContain('active')
    })
})

describe('EmailList discoverability hint', () => {
    it('renders the keyboard shortcuts hint button', async () => {
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const hint = wrapper.find('button[class*="text-neutral-400"]')
        expect(hint.exists()).toBe(true)
        expect(hint.text()).toContain('keyboard shortcuts')
    })

    it('clicking the hint button opens the shortcuts modal', async () => {
        const { showShortcutsModal } = useKeyboardShortcutsModal()
        expect(showShortcutsModal.value).toBe(false)

        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const hint = wrapper.find('button[class*="text-neutral-400"]')
        await hint.trigger('click')

        expect(showShortcutsModal.value).toBe(true)
    })
})
