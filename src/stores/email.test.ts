import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEmailStore } from './email'
import { useConfigStore } from './config'
import type { EmailMeta } from '../parser'
import type { AwsConfig } from '../config'
import { From, Subject, serialize } from '../labels'

vi.mock('../cache', () => ({
    markAsRead: vi.fn().mockResolvedValue(undefined),
    clearEmailCacheForBuckets: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../s3Utils', () => ({ clearS3ClientCache: vi.fn() }))

const storageMock: Record<string, string> = {}
vi.stubGlobal('localStorage', storageMock)

const singleBucketConfig: AwsConfig = {
    credentials: [
        {
            aws_access_key_id: 'AKID',
            aws_secret_access_key: 'secret',
            buckets: [{ aws_region: 'us-east-1', bucket: 'my-bucket' }],
        },
    ],
}

function makeMeta(key: string, overrides: Partial<EmailMeta> = {}): EmailMeta {
    return { key, textPreview: '', formattedDate: '', ...overrides }
}

describe('email store', () => {
    beforeEach(() => {
        for (const k of Object.keys(storageMock)) delete storageMock[k]
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

    describe('threads', () => {
        it('returns an empty array when emailMeta is empty', () => {
            const store = useEmailStore()
            expect(store.threads).toHaveLength(0)
        })

        it('groups emails by reply chain into a single thread', () => {
            const store = useEmailStore()
            store.setEmailMetas([
                makeMeta('msg-1', { messageId: '<root@example.com>' }),
                makeMeta('msg-2', {
                    messageId: '<reply@example.com>',
                    inReplyTo: '<root@example.com>',
                }),
            ])
            expect(store.threads).toHaveLength(1)
            expect(store.threads[0].emails).toHaveLength(2)
        })

        it('treats unrelated emails as separate threads', () => {
            const store = useEmailStore()
            store.setEmailMetas([
                makeMeta('msg-1', { messageId: '<a@example.com>' }),
                makeMeta('msg-2', { messageId: '<b@example.com>' }),
            ])
            expect(store.threads).toHaveLength(2)
        })
    })

    describe('getThread', () => {
        it('returns undefined for an unknown threadId', () => {
            const store = useEmailStore()
            expect(store.getThread('nonexistent')).toBeUndefined()
        })

        it('returns the matching thread by threadId', () => {
            const store = useEmailStore()
            store.setEmailMetas([
                makeMeta('msg-1', { messageId: '<root@example.com>' }),
                makeMeta('msg-2', {
                    messageId: '<reply@example.com>',
                    inReplyTo: '<root@example.com>',
                }),
            ])
            const thread = store.getThread('<root@example.com>')
            expect(thread).toBeDefined()
            expect(thread!.emails).toHaveLength(2)
        })

        it('returns undefined when the threadId matches no thread after addEmailMeta updates', () => {
            const store = useEmailStore()
            store.addEmailMeta(makeMeta('msg-1', { messageId: '<a@example.com>' }))
            expect(store.getThread('<b@example.com>')).toBeUndefined()
        })
    })

    describe('localStorage persistence', () => {
        it('addLabel writes serialized filters to localStorage under the active bucket key', () => {
            const configStore = useConfigStore()
            configStore.updateConfig(singleBucketConfig)

            const store = useEmailStore()
            store.addLabel(From('alice@example.com'))

            const key = 'filters:us-east-1:my-bucket'
            expect(storageMock[key]).toBeDefined()
            const parsed = JSON.parse(storageMock[key]) as { type: string; value: string }[]
            expect(parsed).toHaveLength(1)
            expect(parsed[0].type).toBe('from')
            expect(parsed[0].value).toBe('alice@example.com')
        })

        it('removeLabel updates localStorage after removal', () => {
            const configStore = useConfigStore()
            configStore.updateConfig(singleBucketConfig)

            const store = useEmailStore()
            store.addLabel(From('alice@example.com'))
            store.addLabel(Subject('Hello'))
            const labelToRemove = store.labels[0]
            store.removeLabel(labelToRemove)

            const key = 'filters:us-east-1:my-bucket'
            const parsed = JSON.parse(storageMock[key]) as { type: string; value: string }[]
            expect(parsed).toHaveLength(1)
            expect(parsed[0].type).toBe('subject')
        })

        it('loadPersistedFilters restores labels from a pre-populated localStorage entry', () => {
            storageMock['filters:us-east-1:my-bucket'] = serialize([
                Subject('important'),
                From('bob@example.com'),
            ])

            const store = useEmailStore()
            store.loadPersistedFilters('us-east-1:my-bucket')

            expect(store.labels).toHaveLength(2)
            expect(store.labels[0].type).toBe('subject')
            expect(store.labels[0].value).toBe('important')
            expect(store.labels[1].type).toBe('from')
            expect(store.labels[1].value).toBe('bob@example.com')
        })

        it('loadPersistedFilters clears labels when no entry exists for the bucket', () => {
            const store = useEmailStore()
            store.addLabel(Subject('old filter'))
            store.loadPersistedFilters('us-east-1:empty-bucket')
            expect(store.labels).toHaveLength(0)
        })

        it('addLabel does not write to localStorage when no active bucket is configured', () => {
            const store = useEmailStore()
            store.addLabel(Subject('test'))
            expect(Object.keys(storageMock).some((k) => k.startsWith('filters:'))).toBe(false)
        })
    })
})
