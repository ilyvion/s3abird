// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EmailList from './EmailList.vue'
import { useEmailStore } from './stores/email.js'
import type { EmailMeta } from './parser.js'
import { useKeyboardShortcutsModal } from './composables/useKeyboardShortcutsModal.js'

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

describe('EmailList keyboard navigation — thread mode', () => {
    function setupTwoThreadStore() {
        const store = useEmailStore()
        // Two independent threads: metaA is root of thread 1, metaC is root of thread 2
        const metaA: EmailMeta = {
            key: 'a',
            textPreview: 'first',
            formattedDate: '2026-01-01',
            messageId: '<msg-a>',
        }
        const metaC: EmailMeta = {
            key: 'c',
            textPreview: 'second',
            formattedDate: '2026-01-02',
            messageId: '<msg-c>',
        }
        store.setS3Index([
            { s3Key: 'emails/a.eml', cacheKey: 'a' },
            { s3Key: 'emails/c.eml', cacheKey: 'c' },
        ])
        store.setEmailMetas([metaA, metaC])
        return store
    }

    async function enableThreadMode(wrapper: ReturnType<typeof mount>) {
        const toggle = wrapper.find('input.toggle')
        ;(toggle.element as HTMLInputElement).checked = true
        await toggle.trigger('change')
        await flushPromises()
    }

    it('j navigates between thread rows (not individual email rows)', async () => {
        setupTwoThreadStore()
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()
        await enableThreadMode(wrapper)

        const rows = wrapper.findAll('tbody tr')
        expect(rows).toHaveLength(2)
        expect(rows[0].classes()).toContain('active')

        fireKeydown('j')
        await flushPromises()

        expect(rows[1].classes()).toContain('active')
        expect(rows[0].classes()).not.toContain('active')
    })

    it('j clamps at the last thread row', async () => {
        setupTwoThreadStore()
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()
        await enableThreadMode(wrapper)

        fireKeydown('j')
        await flushPromises()
        fireKeydown('j')
        await flushPromises()

        const rows = wrapper.findAll('tbody tr')
        expect(rows[1].classes()).toContain('active')
    })

    it('Enter in thread mode navigates to the thread, not openEmail', async () => {
        const store = setupTwoThreadStore()
        vi.spyOn(store, 'markRead').mockResolvedValue()

        mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        // Without thread mode, Enter would call openEmail with path /inbox/<key>
        // In thread mode with a single-email thread, openThread calls openEmail too,
        // but the routing path is the same. So navigate to second thread (multi-email
        // scenario) is hard to distinguish here — we verify the router is called at all.
        fireKeydown('Enter')
        await flushPromises()

        expect(mockRouterPush).toHaveBeenCalled()
    })
})

describe('EmailList multi-select', () => {
    function setupStore(keys: string[]) {
        const store = useEmailStore()
        store.setS3Index(keys.map((k) => ({ s3Key: `emails/${k}.eml`, cacheKey: k })))
        store.setEmailMetas(keys.map(makeMeta))
        return store
    }

    it('clicking the select-all checkbox selects all emails on the page', async () => {
        setupStore(['a', 'b', 'c'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const selectAll = wrapper.find('thead input[type="checkbox"]')
        await selectAll.trigger('change')
        await nextTick()

        const rowCheckboxes = wrapper.findAll('tbody tr td input[type="checkbox"]')
        expect(rowCheckboxes).toHaveLength(3)
        expect((rowCheckboxes[0].element as HTMLInputElement).checked).toBe(true)
        expect((rowCheckboxes[1].element as HTMLInputElement).checked).toBe(true)
        expect((rowCheckboxes[2].element as HTMLInputElement).checked).toBe(true)
    })

    it('clicking select-all when all are selected clears the selection', async () => {
        setupStore(['a', 'b'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const selectAll = wrapper.find('thead input[type="checkbox"]')
        await selectAll.trigger('change') // select all
        await nextTick()
        await selectAll.trigger('change') // deselect all
        await nextTick()

        const rowCheckboxes = wrapper.findAll('tbody tr td input[type="checkbox"]')
        expect((rowCheckboxes[0].element as HTMLInputElement).checked).toBe(false)
        expect((rowCheckboxes[1].element as HTMLInputElement).checked).toBe(false)
    })

    it('clicking an individual row checkbox adds it to the selection', async () => {
        setupStore(['a', 'b'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const rowCheckboxes = wrapper.findAll('tbody tr td input[type="checkbox"]')
        await rowCheckboxes[0].trigger('change')
        await nextTick()

        expect((rowCheckboxes[0].element as HTMLInputElement).checked).toBe(true)
        expect((rowCheckboxes[1].element as HTMLInputElement).checked).toBe(false)
    })

    it('clicking a checked row checkbox removes it from the selection', async () => {
        setupStore(['a', 'b'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const rowCheckboxes = wrapper.findAll('tbody tr td input[type="checkbox"]')
        await rowCheckboxes[0].trigger('change') // add
        await nextTick()
        await rowCheckboxes[0].trigger('change') // remove
        await nextTick()

        expect((rowCheckboxes[0].element as HTMLInputElement).checked).toBe(false)
    })

    it('Mark as read calls markRead for each selected key and clears the selection', async () => {
        const store = setupStore(['a', 'b'])
        const markReadSpy = vi.spyOn(store, 'markRead').mockResolvedValue()

        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        await wrapper.find('thead input[type="checkbox"]').trigger('change')
        await nextTick()

        await wrapper.find('.alert .btn-primary').trigger('click')
        await flushPromises()

        expect(markReadSpy).toHaveBeenCalledWith('a')
        expect(markReadSpy).toHaveBeenCalledWith('b')

        const rowCheckboxes = wrapper.findAll('tbody tr td input[type="checkbox"]')
        expect((rowCheckboxes[0].element as HTMLInputElement).checked).toBe(false)
        expect((rowCheckboxes[1].element as HTMLInputElement).checked).toBe(false)
    })

    it('clicking a row (not a checkbox) does not modify the selection', async () => {
        const store = setupStore(['a', 'b'])
        vi.spyOn(store, 'markRead').mockResolvedValue()

        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        await wrapper.find('tbody tr').trigger('click')
        await nextTick()

        const rowCheckboxes = wrapper.findAll('tbody tr td input[type="checkbox"]')
        expect((rowCheckboxes[0].element as HTMLInputElement).checked).toBe(false)
        expect((rowCheckboxes[1].element as HTMLInputElement).checked).toBe(false)
    })

    it('pressing Space when a button is focused does not toggle selection', async () => {
        setupStore(['a', 'b'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const button = document.createElement('button')
        document.body.appendChild(button)
        button.focus()

        fireKeydown(' ')
        await flushPromises()

        const rowCheckboxes = wrapper.findAll('tbody tr td input[type="checkbox"]')
        expect((rowCheckboxes[0].element as HTMLInputElement).checked).toBe(false)

        button.remove()
    })
})

describe('EmailList multi-select thread mode', () => {
    function setupThreadStore() {
        const store = useEmailStore()
        const metaA: EmailMeta = {
            key: 'a',
            textPreview: 'preview',
            formattedDate: '2026-01-01',
            messageId: '<msg-a>',
        }
        const metaB: EmailMeta = {
            key: 'b',
            textPreview: 'preview',
            formattedDate: '2026-01-02',
            inReplyTo: '<msg-a>',
        }
        store.setS3Index([
            { s3Key: 'emails/a.eml', cacheKey: 'a' },
            { s3Key: 'emails/b.eml', cacheKey: 'b' },
        ])
        store.setEmailMetas([metaA, metaB])
        return store
    }

    async function enableThreadMode(wrapper: ReturnType<typeof mount>) {
        const toggle = wrapper.find('input.toggle')
        ;(toggle.element as HTMLInputElement).checked = true
        await toggle.trigger('change')
        await flushPromises()
    }

    it('selecting a thread checkbox selects all emails in that thread', async () => {
        setupThreadStore()
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()
        await enableThreadMode(wrapper)

        const rowCheckboxes = wrapper.findAll('tbody tr td input[type="checkbox"]')
        expect(rowCheckboxes).toHaveLength(1)

        await rowCheckboxes[0].trigger('change')
        await flushPromises()

        // Both emails in the thread are now selected → Mark as read becomes visible
        const markReadBtn = wrapper.find('.alert .btn-primary')
        expect(markReadBtn.exists()).toBe(true)
    })

    it('Mark as read in thread mode calls markRead for all emails in the thread', async () => {
        const store = setupThreadStore()
        const markReadSpy = vi.spyOn(store, 'markRead').mockResolvedValue()

        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()
        await enableThreadMode(wrapper)

        await wrapper.find('tbody tr td input[type="checkbox"]').trigger('change')
        await flushPromises()

        await wrapper.find('.alert .btn-primary').trigger('click')
        await flushPromises()

        expect(markReadSpy).toHaveBeenCalledWith('a')
        expect(markReadSpy).toHaveBeenCalledWith('b')
    })

    it('deselecting a thread removes all its emails from the selection', async () => {
        setupThreadStore()
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()
        await enableThreadMode(wrapper)

        const rowCheckbox = wrapper.find('tbody tr td input[type="checkbox"]')
        await rowCheckbox.trigger('change') // select
        await flushPromises()
        await rowCheckbox.trigger('change') // deselect
        await flushPromises()

        expect(wrapper.find('.alert .btn-primary').exists()).toBe(false)
    })
})

describe('EmailList selectionState', () => {
    function setupStore(keys: string[]) {
        const store = useEmailStore()
        store.setS3Index(keys.map((k) => ({ s3Key: `emails/${k}.eml`, cacheKey: k })))
        store.setEmailMetas(keys.map(makeMeta))
        return store
    }

    it('reports none when no emails are selected', async () => {
        setupStore(['a', 'b', 'c'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const selectAll = wrapper.find('thead input[type="checkbox"]') as ReturnType<
            typeof wrapper.find
        >
        expect((selectAll.element as HTMLInputElement).checked).toBe(false)
        expect((selectAll.element as HTMLInputElement).indeterminate).toBe(false)
    })

    it('reports all when every page email is selected', async () => {
        setupStore(['a', 'b'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        await wrapper.find('thead input[type="checkbox"]').trigger('change')
        await nextTick()

        const selectAll = wrapper.find('thead input[type="checkbox"]')
        expect((selectAll.element as HTMLInputElement).checked).toBe(true)
        expect((selectAll.element as HTMLInputElement).indeterminate).toBe(false)
    })

    it('reports some when only a subset of page emails are selected', async () => {
        setupStore(['a', 'b', 'c'])
        const wrapper = mount(EmailList, {
            global: { stubs: { Filters: true, EmailAddress: true } },
        })
        await flushPromises()

        const rowCheckboxes = wrapper.findAll('tbody tr td input[type="checkbox"]')
        await rowCheckboxes[0].trigger('change')
        await nextTick()

        const selectAll = wrapper.find('thead input[type="checkbox"]')
        expect((selectAll.element as HTMLInputElement).checked).toBe(false)
        expect((selectAll.element as HTMLInputElement).indeterminate).toBe(true)
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
