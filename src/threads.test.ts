import { describe, it, expect } from 'vitest'
import { groupIntoThreads } from './threads'
import type { EmailMeta } from './parser'

function makeMeta(overrides: Partial<EmailMeta> & { key: string }): EmailMeta {
    return {
        textPreview: '',
        ...overrides,
    }
}

describe('groupIntoThreads', () => {
    it('places two emails connected by In-Reply-To in the same group', () => {
        const original = makeMeta({
            key: 'msg-1',
            messageId: '<original@example.com>',
            date: '2024-01-01T10:00:00Z',
        })
        const reply = makeMeta({
            key: 'msg-2',
            messageId: '<reply@example.com>',
            inReplyTo: '<original@example.com>',
            date: '2024-01-01T11:00:00Z',
        })

        const threads = groupIntoThreads([original, reply])

        expect(threads).toHaveLength(1)
        expect(threads[0].count).toBe(2)
        expect(threads[0].emails.map((e) => e.key)).toContain('msg-1')
        expect(threads[0].emails.map((e) => e.key)).toContain('msg-2')
    })

    it('groups three emails forming a chain into one thread', () => {
        const first = makeMeta({
            key: 'msg-1',
            messageId: '<first@example.com>',
            date: '2024-01-01T10:00:00Z',
        })
        const second = makeMeta({
            key: 'msg-2',
            messageId: '<second@example.com>',
            inReplyTo: '<first@example.com>',
            references: ['<first@example.com>'],
            date: '2024-01-01T11:00:00Z',
        })
        const third = makeMeta({
            key: 'msg-3',
            messageId: '<third@example.com>',
            inReplyTo: '<second@example.com>',
            references: ['<first@example.com>', '<second@example.com>'],
            date: '2024-01-01T12:00:00Z',
        })

        const threads = groupIntoThreads([first, second, third])

        expect(threads).toHaveLength(1)
        expect(threads[0].count).toBe(3)
    })

    it('places unrelated emails in separate groups', () => {
        const a = makeMeta({
            key: 'msg-a',
            messageId: '<a@example.com>',
            date: '2024-01-01T10:00:00Z',
        })
        const b = makeMeta({
            key: 'msg-b',
            messageId: '<b@example.com>',
            date: '2024-01-01T11:00:00Z',
        })
        const c = makeMeta({
            key: 'msg-c',
            messageId: '<c@example.com>',
            date: '2024-01-01T09:00:00Z',
        })

        const threads = groupIntoThreads([a, b, c])

        expect(threads).toHaveLength(3)
        expect(threads.every((t) => t.count === 1)).toBe(true)
    })

    it('sorts ThreadGroup[] newest-first by latest email date', () => {
        const old = makeMeta({
            key: 'msg-old',
            messageId: '<old@example.com>',
            date: '2024-01-01T08:00:00Z',
        })
        const mid = makeMeta({
            key: 'msg-mid',
            messageId: '<mid@example.com>',
            date: '2024-01-02T08:00:00Z',
        })
        const newest = makeMeta({
            key: 'msg-new',
            messageId: '<new@example.com>',
            date: '2024-01-03T08:00:00Z',
        })

        const threads = groupIntoThreads([old, mid, newest])

        expect(threads[0].latest.key).toBe('msg-new')
        expect(threads[1].latest.key).toBe('msg-mid')
        expect(threads[2].latest.key).toBe('msg-old')
    })

    it('produces a ThreadGroup with count 1 for a single email', () => {
        const solo = makeMeta({ key: 'solo', messageId: '<solo@example.com>' })

        const threads = groupIntoThreads([solo])

        expect(threads).toHaveLength(1)
        expect(threads[0].count).toBe(1)
        expect(threads[0].emails[0].key).toBe('solo')
    })

    it('sets latest to the most recently dated email in a multi-email thread', () => {
        const first = makeMeta({
            key: 'msg-1',
            messageId: '<first@example.com>',
            date: '2024-01-01T10:00:00Z',
        })
        const second = makeMeta({
            key: 'msg-2',
            messageId: '<second@example.com>',
            inReplyTo: '<first@example.com>',
            date: '2024-01-01T15:00:00Z',
        })

        const threads = groupIntoThreads([first, second])

        expect(threads[0].latest.key).toBe('msg-2')
    })

    it('sorts emails oldest-first within a thread', () => {
        const first = makeMeta({
            key: 'msg-1',
            messageId: '<first@example.com>',
            date: '2024-01-01T10:00:00Z',
        })
        const second = makeMeta({
            key: 'msg-2',
            messageId: '<second@example.com>',
            inReplyTo: '<first@example.com>',
            date: '2024-01-01T15:00:00Z',
        })

        const threads = groupIntoThreads([second, first])

        expect(threads[0].emails[0].key).toBe('msg-1')
        expect(threads[0].emails[1].key).toBe('msg-2')
    })

    it('connects emails via References even without In-Reply-To', () => {
        const root = makeMeta({
            key: 'msg-root',
            messageId: '<root@example.com>',
            date: '2024-01-01T10:00:00Z',
        })
        const reply = makeMeta({
            key: 'msg-reply',
            messageId: '<reply@example.com>',
            references: ['<root@example.com>'],
            date: '2024-01-01T11:00:00Z',
        })

        const threads = groupIntoThreads([root, reply])

        expect(threads).toHaveLength(1)
        expect(threads[0].count).toBe(2)
    })
})
