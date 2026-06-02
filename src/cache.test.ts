// @vitest-environment node
import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCachedEmail, setCachedEmail, clearEmailCache, evictStaleEntries } from './cache'
import type { ParsedEmail } from './parser'

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000

const mockEmail = {
    key: 'test-key',
    textAsHtml: '<p>Hello</p>',
    subject: 'Test Subject',
} as unknown as ParsedEmail

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

    describe('evictStaleEntries', () => {
        it('removes entries older than 14 days', async () => {
            vi.setSystemTime(new Date('2026-06-01T00:00:00Z').getTime() - FOURTEEN_DAYS_MS - 1000)
            await setCachedEmail('old1', mockEmail)
            await setCachedEmail('old2', mockEmail)

            vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
            await setCachedEmail('fresh', mockEmail)

            await evictStaleEntries()

            expect(await getCachedEmail('old1')).toBeUndefined()
            expect(await getCachedEmail('old2')).toBeUndefined()
            expect(await getCachedEmail('fresh')).toEqual(mockEmail)
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
        it('removes all entries', async () => {
            await setCachedEmail('key1', mockEmail)
            await setCachedEmail('key2', { ...mockEmail, key: 'key2' } as unknown as ParsedEmail)
            await clearEmailCache()
            expect(await getCachedEmail('key1')).toBeUndefined()
            expect(await getCachedEmail('key2')).toBeUndefined()
        })
    })
})
