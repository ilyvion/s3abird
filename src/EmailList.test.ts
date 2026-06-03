// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import EmailList from './EmailList.vue'
import { useEmailStore } from './stores/email.js'
import type { EmailMeta } from './parser.js'

vi.mock('vue-router', () => ({
    useRouter: () => ({ push: vi.fn() }),
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

beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
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
