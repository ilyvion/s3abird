// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { useInboxLoader } from './useInboxLoader'
import { useEmailStore } from './stores/email'

const mockEvictStaleEntries = vi.fn()
const mockS3Send = vi.fn()

vi.mock('./cache.js', () => ({
    evictStaleEntries: (...args: unknown[]) => mockEvictStaleEntries(...args),
    getAllEmailMetas: vi.fn().mockResolvedValue([]),
    getReadKeys: vi.fn().mockResolvedValue(new Set<string>()),
    getCachedEmail: vi.fn().mockResolvedValue(undefined),
    setCachedEmail: vi.fn().mockResolvedValue(undefined),
    setEmailMeta: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./s3Utils.js', () => ({
    getS3Client: vi.fn().mockReturnValue({
        send: (...args: unknown[]) => mockS3Send(...args),
    }),
    filterAndSortByDate: (items: unknown[]) => items,
}))

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: vi.fn(),
    ListObjectsV2Command: vi.fn(),
    GetObjectCommand: vi.fn(),
}))

vi.mock('./parser.js', () => ({
    default: vi.fn(),
    extractMeta: vi.fn().mockReturnValue({ key: 'k', formattedDate: '', textPreview: '' }),
    applyFormattedDate: vi.fn().mockImplementation((m: unknown) => m),
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

beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.setItem('config', VALID_CONFIG)
    mockEvictStaleEntries.mockReset()
    mockS3Send.mockReset()
    mockEvictStaleEntries.mockResolvedValue(undefined)
    mockS3Send.mockResolvedValue({ Contents: [], IsTruncated: false })
})

describe('useInboxLoader', () => {
    describe('loadEmails', () => {
        it('completes loading and populates the email store s3Index', async () => {
            const { loadEmails } = useInboxLoader()
            const store = useEmailStore()

            await loadEmails(true)
            await flushPromises()

            expect(store.s3Index).toEqual([])
            expect(mockEvictStaleEntries).toHaveBeenCalled()
            expect(mockS3Send).toHaveBeenCalled()
        })

        it('sets loading to false after completion', async () => {
            const { loadEmails, loading } = useInboxLoader()

            const promise = loadEmails(true)
            expect(loading.value).toBe(true)

            await promise
            await flushPromises()

            expect(loading.value).toBe(false)
        })

        it('runs evictStaleEntries and S3 listing concurrently', async () => {
            let evictResolve!: () => void
            mockEvictStaleEntries.mockReturnValue(
                new Promise<void>((resolve) => {
                    evictResolve = resolve
                })
            )

            const { loadEmails } = useInboxLoader()
            const promise = loadEmails(true)

            // Allow the async function to advance to the parallel await point
            await Promise.resolve()

            // S3 listing must have started even though eviction is still pending
            expect(mockS3Send).toHaveBeenCalled()
            expect(mockEvictStaleEntries).toHaveBeenCalled()

            evictResolve()
            await promise
        })

        it('sets error and stops loading when S3 listing fails', async () => {
            mockS3Send.mockRejectedValue(new Error('S3 unavailable'))

            const { loadEmails, loading, error } = useInboxLoader()
            await loadEmails(true)

            expect(loading.value).toBe(false)
            expect(error.value).toBe('S3 unavailable')
        })

        it('skips loading when s3Index is already populated and force is false', async () => {
            const store = useEmailStore()
            store.setS3Index([{ s3Key: 'emails/a.eml', cacheKey: 'ck' }])

            const { loadEmails } = useInboxLoader()
            await loadEmails()

            expect(mockS3Send).not.toHaveBeenCalled()
        })
    })
})
