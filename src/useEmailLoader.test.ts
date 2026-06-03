// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useEmailLoader } from './useEmailLoader'
import { useEmailStore } from './stores/email'
import { makeCacheKey } from './config'
import type { ParsedEmail } from './parser'
import { getS3Client } from './s3Utils'
import type { S3Client } from '@aws-sdk/client-s3'

const mockCachedEmail = {
    key: 'test-key',
    textAsHtml: '<p>Hello</p>',
    subject: 'Test',
} as unknown as ParsedEmail

const mockGetCachedEmail = vi.fn()
const mockSetCachedEmail = vi.fn()

vi.mock('./cache.js', () => ({
    getCachedEmail: (...args: unknown[]) => mockGetCachedEmail(...args),
    setCachedEmail: (...args: unknown[]) => mockSetCachedEmail(...args),
    setEmailMeta: vi.fn().mockResolvedValue(undefined),
    getAllEmailMetas: vi.fn().mockResolvedValue([]),
    evictStaleEntries: vi.fn().mockResolvedValue(undefined),
    getReadKeys: vi.fn().mockResolvedValue(new Set<string>()),
    markAsRead: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(),
    GetObjectCommand: vi.fn(),
}))

vi.mock('./parser.js', () => ({
    default: vi.fn(),
}))

vi.mock('./s3Utils.js', () => ({
    getS3Client: vi.fn(),
}))

const VALID_CONFIG = JSON.stringify({
    credentials: [
        {
            aws_access_key_id: 'AKIAIOSFODNN7EXAMPLE',
            aws_secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            buckets: [{ aws_region: 'us-east-1', bucket: 'my-bucket' }],
        },
    ],
})

function makeMessageId(): string {
    return makeCacheKey(
        {
            aws_region: 'us-east-1',
            bucket: 'my-bucket',
            aws_access_key_id: 'AKIAIOSFODNN7EXAMPLE',
            aws_secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        },
        'emails/test.eml'
    )
}

function makeWrapper(messageId: string) {
    const TestComponent = defineComponent({
        setup() {
            return useEmailLoader(messageId)
        },
        template: '<div></div>',
    })
    return mount(TestComponent)
}

beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    mockGetCachedEmail.mockReset()
    mockSetCachedEmail.mockReset()
    vi.mocked(getS3Client).mockReset()
})

describe('useEmailLoader', () => {
    describe('cache hit path', () => {
        it('calls markRead when loading from cache', async () => {
            localStorage.setItem('config', VALID_CONFIG)
            const messageId = makeMessageId()
            mockGetCachedEmail.mockResolvedValue(mockCachedEmail)

            makeWrapper(messageId)
            const store = useEmailStore()
            const markReadSpy = vi.spyOn(store, 'markRead').mockResolvedValue()

            await flushPromises()

            expect(markReadSpy).toHaveBeenCalledWith(messageId)
        })

        it('exposes the cached email', async () => {
            localStorage.setItem('config', VALID_CONFIG)
            const messageId = makeMessageId()
            mockGetCachedEmail.mockResolvedValue(mockCachedEmail)

            const wrapper = makeWrapper(messageId)
            await flushPromises()

            expect(wrapper.vm.email).toEqual(mockCachedEmail)
            expect(wrapper.vm.error).toBeNull()
        })
    })

    describe('error paths', () => {
        it('sets error when no bucket config is present', async () => {
            const wrapper = makeWrapper('some-message-id')
            await flushPromises()

            expect(wrapper.vm.error).toBe('Missing settings')
        })

        it('sets error for an invalid message ID', async () => {
            localStorage.setItem('config', VALID_CONFIG)
            const wrapper = makeWrapper('not-a-valid-base64-key')
            await flushPromises()

            expect(wrapper.vm.error).toBe('Invalid email ID')
        })
    })

    describe('unmount cancellation', () => {
        it('skips setting email and calling markRead when unmounted during cache lookup', async () => {
            localStorage.setItem('config', VALID_CONFIG)
            const messageId = makeMessageId()

            let resolveCache!: (v: ParsedEmail | null) => void
            mockGetCachedEmail.mockReturnValue(
                new Promise<ParsedEmail | null>((r) => {
                    resolveCache = r
                })
            )

            const wrapper = makeWrapper(messageId)
            const store = useEmailStore()
            const markReadSpy = vi.spyOn(store, 'markRead').mockResolvedValue()

            wrapper.unmount()

            resolveCache(mockCachedEmail)
            await flushPromises()

            expect(wrapper.vm.email).toBeUndefined()
            expect(markReadSpy).not.toHaveBeenCalled()
        })

        it('passes abortSignal to s3.send', async () => {
            localStorage.setItem('config', VALID_CONFIG)
            const messageId = makeMessageId()
            mockGetCachedEmail.mockResolvedValue(null)

            const mockSend = vi.fn().mockReturnValue(new Promise(() => {}))
            vi.mocked(getS3Client).mockReturnValue({ send: mockSend } as unknown as S3Client)

            const wrapper = makeWrapper(messageId)
            await flushPromises()

            expect(mockSend).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ abortSignal: expect.any(AbortSignal) })
            )

            wrapper.unmount()
        })

        it('does not set error when unmounted during S3 fetch', async () => {
            localStorage.setItem('config', VALID_CONFIG)
            const messageId = makeMessageId()
            mockGetCachedEmail.mockResolvedValue(null)

            let rejectSend!: (e: unknown) => void
            const mockSend = vi.fn().mockReturnValue(
                new Promise<never>((_, r) => {
                    rejectSend = r
                })
            )
            vi.mocked(getS3Client).mockReturnValue({ send: mockSend } as unknown as S3Client)

            const wrapper = makeWrapper(messageId)
            await flushPromises()

            wrapper.unmount()

            rejectSend(new DOMException('The operation was aborted', 'AbortError'))
            await flushPromises()

            expect(wrapper.vm.error).toBeNull()
            expect(wrapper.vm.email).toBeUndefined()
        })
    })
})
