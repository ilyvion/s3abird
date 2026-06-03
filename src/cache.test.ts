// @vitest-environment node
import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
    getCachedEmail,
    setCachedEmail,
    setEmailMeta,
    getAllEmailMetas,
    clearEmailCache,
    clearEmailCacheForBuckets,
    evictStaleEntries,
    markAsRead,
    getReadKeys,
} from './cache'
import { makeCacheKey } from './config'
import type { EffectiveBucketConfig } from './config'
import type { ParsedEmail, EmailMeta } from './parser'

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

// ParsedEmail extends postal-mime's Email which requires headers, headerLines, and attachments.
// Tests only exercise cache storage/retrieval so a minimal object suffices; full construction
// would be disproportionate effort.
const mockEmail = {
    key: 'test-key',
    textAsHtml: '<p>Hello</p>',
    subject: 'Test Subject',
} as unknown as ParsedEmail

const mockMeta: EmailMeta = {
    key: 'test-key',
    subject: 'Test Subject',
    formattedDate: '',
    textPreview: 'Hello',
}

describe('cache', () => {
    beforeEach(async () => {
        await clearEmailCache()
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe('getCachedEmail', () => {
        it('returns undefined for missing entries', async () => {
            expect(await getCachedEmail('nonexistent')).toBeUndefined()
        })

        it('returns the email for a fresh entry', async () => {
            await setCachedEmail('key1', mockEmail)
            expect(await getCachedEmail('key1')).toEqual(mockEmail)
        })

        it('returns undefined for an entry older than 14 days', async () => {
            vi.setSystemTime(new Date('2026-06-01T00:00:00Z').getTime() - FOURTEEN_DAYS_MS - 1)
            await setCachedEmail('old-key', mockEmail)
            vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))

            expect(await getCachedEmail('old-key')).toBeUndefined()
        })

        it('deletes the entry from the store when it is stale', async () => {
            vi.setSystemTime(new Date('2026-06-01T00:00:00Z').getTime() - FOURTEEN_DAYS_MS - 1)
            await setCachedEmail('old-key', mockEmail)
            vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))

            await getCachedEmail('old-key')
            // A second read should still return undefined (entry was deleted, not just skipped)
            expect(await getCachedEmail('old-key')).toBeUndefined()
        })

        it('also removes the email-meta entry when evicting a stale email on demand', async () => {
            vi.setSystemTime(new Date('2026-06-01T00:00:00Z').getTime() - FOURTEEN_DAYS_MS - 1)
            await setCachedEmail('stale-key', mockEmail)
            await setEmailMeta('stale-key', mockMeta)
            vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))

            await getCachedEmail('stale-key')

            const metas = await getAllEmailMetas()
            expect(metas.find((m) => m.key === 'stale-key')).toBeUndefined()
        })

        it('returns the email for an entry at exactly the 14-day boundary', async () => {
            vi.setSystemTime(new Date('2026-06-01T00:00:00Z').getTime() - FOURTEEN_DAYS_MS)
            await setCachedEmail('boundary-key', mockEmail)
            vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))

            // cachedAt === now - FOURTEEN_DAYS_MS, so entry.cachedAt < cutoff is false → still fresh
            expect(await getCachedEmail('boundary-key')).toEqual(mockEmail)
        })
    })

    describe('setCachedEmail', () => {
        it('stores entries that are subsequently retrievable', async () => {
            await setCachedEmail('key1', mockEmail)
            expect(await getCachedEmail('key1')).toEqual(mockEmail)
        })

        it('overwrites an existing entry', async () => {
            const updated: ParsedEmail = { ...mockEmail, subject: 'Updated' }
            await setCachedEmail('key1', mockEmail)
            await setCachedEmail('key1', updated)
            expect(await getCachedEmail('key1')).toEqual(updated)
        })
    })

    describe('setEmailMeta / getAllEmailMetas', () => {
        it('returns an empty array when no metadata is stored', async () => {
            expect(await getAllEmailMetas()).toEqual([])
        })

        it('stores metadata that is subsequently retrievable via getAllEmailMetas', async () => {
            await setEmailMeta('key1', mockMeta)
            const metas = await getAllEmailMetas()
            expect(metas).toHaveLength(1)
            expect(metas[0]).toEqual(mockMeta)
        })

        it('overwrites an existing metadata entry', async () => {
            const updated: EmailMeta = { ...mockMeta, subject: 'Updated' }
            await setEmailMeta('key1', mockMeta)
            await setEmailMeta('key1', updated)
            const metas = await getAllEmailMetas()
            expect(metas).toHaveLength(1)
            expect(metas[0].subject).toBe('Updated')
        })

        it('stores multiple entries and returns them all', async () => {
            const meta2: EmailMeta = { key: 'key2', textPreview: 'World', formattedDate: '' }
            await setEmailMeta('key1', mockMeta)
            await setEmailMeta('key2', meta2)
            const metas = await getAllEmailMetas()
            expect(metas).toHaveLength(2)
        })
    })

    describe('evictStaleEntries', () => {
        it('removes entries older than 14 days from both stores', async () => {
            vi.setSystemTime(new Date('2026-06-01T00:00:00Z').getTime() - FOURTEEN_DAYS_MS - 1000)
            await setCachedEmail('old1', mockEmail)
            await setEmailMeta('old1', mockMeta)
            await setCachedEmail('old2', mockEmail)
            await setEmailMeta('old2', { ...mockMeta, key: 'old2' })

            vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
            await setCachedEmail('fresh', mockEmail)
            await setEmailMeta('fresh', { ...mockMeta, key: 'fresh' })

            await evictStaleEntries()

            expect(await getCachedEmail('old1')).toBeUndefined()
            expect(await getCachedEmail('old2')).toBeUndefined()
            expect(await getCachedEmail('fresh')).toEqual(mockEmail)

            const metas = await getAllEmailMetas()
            const metaKeys = metas.map((m) => m.key)
            expect(metaKeys).not.toContain('old1')
            expect(metaKeys).not.toContain('old2')
            expect(metaKeys).toContain('fresh')
        })

        it('keeps entries younger than 14 days', async () => {
            await setCachedEmail('key1', mockEmail)
            await evictStaleEntries()
            expect(await getCachedEmail('key1')).toEqual(mockEmail)
        })

        it('is a no-op on an empty cache', async () => {
            await expect(evictStaleEntries()).resolves.toBeUndefined()
        })
    })

    describe('clearEmailCache', () => {
        it('removes all entries from both stores', async () => {
            await setCachedEmail('key1', mockEmail)
            // Same reason as mockEmail above: minimal spread to vary the key.
            await setCachedEmail('key2', { ...mockEmail, key: 'key2' } as unknown as ParsedEmail)
            await setEmailMeta('key1', mockMeta)
            await setEmailMeta('key2', { ...mockMeta, key: 'key2' })
            await clearEmailCache()
            expect(await getCachedEmail('key1')).toBeUndefined()
            expect(await getCachedEmail('key2')).toBeUndefined()
            expect(await getAllEmailMetas()).toEqual([])
        })
    })

    describe('markAsRead / getReadKeys', () => {
        it('getReadKeys returns an empty set when no keys are marked', async () => {
            expect(await getReadKeys()).toEqual(new Set())
        })

        it('markAsRead then getReadKeys returns the key', async () => {
            await markAsRead('key1')
            expect(await getReadKeys()).toEqual(new Set(['key1']))
        })

        it('a second call to markAsRead does not error and key remains present', async () => {
            await markAsRead('key1')
            await expect(markAsRead('key1')).resolves.toBeUndefined()
            expect(await getReadKeys()).toEqual(new Set(['key1']))
        })

        it('marks multiple keys and returns all of them', async () => {
            await markAsRead('key1')
            await markAsRead('key2')
            const keys = await getReadKeys()
            expect(keys).toContain('key1')
            expect(keys).toContain('key2')
            expect(keys.size).toBe(2)
        })

        it('clearEmailCache removes read-status entries', async () => {
            await markAsRead('key1')
            await clearEmailCache()
            expect(await getReadKeys()).toEqual(new Set())
        })
    })

    describe('clearEmailCacheForBuckets', () => {
        const bucketA: EffectiveBucketConfig = {
            aws_region: 'us-east-1',
            aws_access_key_id: 'AKID',
            aws_secret_access_key: 'secret',
            bucket: 'bucket-a',
        }
        const bucketB: EffectiveBucketConfig = {
            aws_region: 'us-west-2',
            aws_access_key_id: 'AKID',
            aws_secret_access_key: 'secret',
            bucket: 'bucket-b',
        }

        it('is a no-op when given an empty array', async () => {
            await setCachedEmail(makeCacheKey(bucketA, 'msg1'), mockEmail)
            await clearEmailCacheForBuckets([])
            expect(await getCachedEmail(makeCacheKey(bucketA, 'msg1'))).toEqual(mockEmail)
        })

        it('removes emails and meta for matching bucket', async () => {
            const key = makeCacheKey(bucketA, 'msg1')
            await setCachedEmail(key, mockEmail)
            await setEmailMeta(key, mockMeta)

            await clearEmailCacheForBuckets([bucketA])

            expect(await getCachedEmail(key)).toBeUndefined()
            expect(await getAllEmailMetas()).toEqual([])
        })

        it('leaves emails for non-matching bucket untouched', async () => {
            const keyA = makeCacheKey(bucketA, 'msg1')
            const keyB = makeCacheKey(bucketB, 'msg1')
            await setCachedEmail(keyA, mockEmail)
            await setCachedEmail(keyB, mockEmail)

            await clearEmailCacheForBuckets([bucketA])

            expect(await getCachedEmail(keyA)).toBeUndefined()
            expect(await getCachedEmail(keyB)).toEqual(mockEmail)
        })

        it('removes read-status entries for matching bucket', async () => {
            const keyA = makeCacheKey(bucketA, 'msg1')
            const keyB = makeCacheKey(bucketB, 'msg1')
            await markAsRead(keyA)
            await markAsRead(keyB)

            await clearEmailCacheForBuckets([bucketA])

            const remaining = await getReadKeys()
            expect(remaining).not.toContain(keyA)
            expect(remaining).toContain(keyB)
        })
    })
})
