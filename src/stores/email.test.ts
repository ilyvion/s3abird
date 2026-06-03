import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEmailStore } from './email'
import type { EmailMeta } from '../parser'

vi.mock('../cache', () => ({
    markAsRead: vi.fn().mockResolvedValue(undefined),
}))

function makeMeta(key: string, overrides: Partial<EmailMeta> = {}): EmailMeta {
    return { key, textPreview: '', formattedDate: '', ...overrides }
}

describe('email store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('starts with an empty s3Index and emailMeta', () => {
        const store = useEmailStore()
        expect(store.s3Index).toHaveLength(0)
        expect(store.emailMeta.size).toBe(0)
    })

    it('starts with an empty readKeys set', () => {
        const store = useEmailStore()
        expect(store.readKeys.size).toBe(0)
    })

    describe('setS3Index', () => {
        it('replaces s3Index', () => {
            const store = useEmailStore()
            store.setS3Index([{ s3Key: 'a', cacheKey: 'ca' }])
            expect(store.s3Index).toHaveLength(1)
            store.setS3Index([
                { s3Key: 'b', cacheKey: 'cb' },
                { s3Key: 'c', cacheKey: 'cc' },
            ])
            expect(store.s3Index).toHaveLength(2)
        })
    })

    describe('addEmailMeta', () => {
        it('adds a metadata entry keyed by meta.key', () => {
            const store = useEmailStore()
            store.addEmailMeta(makeMeta('ca'))
            expect(store.emailMeta.has('ca')).toBe(true)
        })

        it('overwrites an existing entry', () => {
            const store = useEmailStore()
            store.addEmailMeta(makeMeta('ca', { subject: 'old' }))
            store.addEmailMeta(makeMeta('ca', { subject: 'new' }))
            expect(store.emailMeta.get('ca')?.subject).toBe('new')
        })
    })

    describe('setEmailMetas', () => {
        it('replaces the entire emailMeta map', () => {
            const store = useEmailStore()
            store.addEmailMeta(makeMeta('ca'))
            store.setEmailMetas([makeMeta('cb'), makeMeta('cc')])
            expect(store.emailMeta.has('ca')).toBe(false)
            expect(store.emailMeta.has('cb')).toBe(true)
            expect(store.emailMeta.has('cc')).toBe(true)
        })
    })

    describe('filteredIndex', () => {
        it('returns all entries when no labels are active', () => {
            const store = useEmailStore()
            store.setS3Index([
                { s3Key: 'a', cacheKey: 'ca' },
                { s3Key: 'b', cacheKey: 'cb' },
            ])
            store.setEmailMetas([makeMeta('ca'), makeMeta('cb')])
            expect(store.filteredIndex).toHaveLength(2)
        })

        it('includes entries whose metadata has not yet loaded', () => {
            const store = useEmailStore()
            store.setS3Index([{ s3Key: 'a', cacheKey: 'ca' }])
            // no emailMeta set — entry has no metadata yet
            store.addLabel({ type: 'subject', value: 'x', f: () => false })
            expect(store.filteredIndex).toHaveLength(1)
        })

        it('applies label filters to loaded metadata', () => {
            const store = useEmailStore()
            store.setS3Index([
                { s3Key: 'a', cacheKey: 'ca' },
                { s3Key: 'b', cacheKey: 'cb' },
            ])
            store.setEmailMetas([
                makeMeta('ca', { subject: 'Match' }),
                makeMeta('cb', { subject: 'Other' }),
            ])
            store.addLabel({ type: 'subject', value: 'Match', f: (e) => e.subject === 'Match' })
            expect(store.filteredIndex).toHaveLength(1)
            expect(store.filteredIndex[0].cacheKey).toBe('ca')
        })

        it('removeLabel stops its filter from applying', () => {
            const store = useEmailStore()
            store.setS3Index([
                { s3Key: 'a', cacheKey: 'ca' },
                { s3Key: 'b', cacheKey: 'cb' },
            ])
            store.setEmailMetas([makeMeta('ca'), makeMeta('cb')])
            store.addLabel({ type: 'subject', value: '', f: () => false })
            expect(store.filteredIndex).toHaveLength(0)
            const storedLabel = store.labels[0]
            store.removeLabel(storedLabel)
            expect(store.filteredIndex).toHaveLength(2)
        })
    })

    describe('setReadKeys', () => {
        it('replaces the readKeys set', () => {
            const store = useEmailStore()
            store.setReadKeys(new Set(['key1', 'key2']))
            expect(store.readKeys.has('key1')).toBe(true)
            expect(store.readKeys.has('key2')).toBe(true)
            store.setReadKeys(new Set(['key3']))
            expect(store.readKeys.has('key1')).toBe(false)
            expect(store.readKeys.has('key3')).toBe(true)
        })
    })

    describe('markRead', () => {
        it('adds the key to readKeys', async () => {
            const store = useEmailStore()
            await store.markRead('key1')
            expect(store.readKeys.has('key1')).toBe(true)
        })

        it('calling markRead twice does not error and key remains present', async () => {
            const store = useEmailStore()
            await store.markRead('key1')
            await store.markRead('key1')
            expect(store.readKeys.has('key1')).toBe(true)
        })
    })

    describe('isRead', () => {
        it('returns false for a key that has not been marked read', () => {
            const store = useEmailStore()
            expect(store.isRead('key1')).toBe(false)
        })

        it('returns true after setReadKeys includes the key', () => {
            const store = useEmailStore()
            store.setReadKeys(new Set(['key1']))
            expect(store.isRead('key1')).toBe(true)
        })

        it('returns true after markRead', async () => {
            const store = useEmailStore()
            await store.markRead('key1')
            expect(store.isRead('key1')).toBe(true)
        })

        it('returns false for a key not in readKeys', () => {
            const store = useEmailStore()
            store.setReadKeys(new Set(['key1']))
            expect(store.isRead('key2')).toBe(false)
        })
    })
})
