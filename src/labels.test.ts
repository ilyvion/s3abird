import { describe, it, expect } from 'vitest'
import type { Email } from 'postal-mime'
import { To, From, Subject, Body, parse, serialize, deserialize } from './labels'

function makeEmail(overrides: Partial<Email> = {}): Email {
    return {
        headers: [],
        attachments: [],
        ...overrides,
    } as Email
}

describe('Subject filter', () => {
    it('matches when subject contains the text', () => {
        const filter = Subject('hello')
        expect(filter.f(makeEmail({ subject: 'say hello world' }))).toBe(true)
    })

    it('does not match when subject does not contain the text', () => {
        const filter = Subject('hello')
        expect(filter.f(makeEmail({ subject: 'goodbye' }))).toBe(false)
    })

    it('does not match when email has no subject', () => {
        const filter = Subject('hello')
        expect(filter.f(makeEmail({ subject: undefined }))).toBe(false)
    })

    it('matches case-insensitively', () => {
        const filter = Subject('HELLO')
        expect(filter.f(makeEmail({ subject: 'say hello world' }))).toBe(true)
    })
})

describe('To filter', () => {
    it('matches when to address contains the value', () => {
        const filter = To('alice')
        expect(filter.f(makeEmail({ to: [{ address: 'alice@example.com', name: '' }] }))).toBe(true)
    })

    it('does not match when to address is absent', () => {
        const filter = To('alice')
        expect(filter.f(makeEmail({ to: undefined }))).toBe(false)
    })

    it('matches case-insensitively on address', () => {
        const filter = To('ALICE')
        expect(filter.f(makeEmail({ to: [{ address: 'alice@example.com', name: '' }] }))).toBe(true)
    })

    it('matches case-insensitively on name', () => {
        const filter = To('alice')
        expect(
            filter.f(makeEmail({ to: [{ address: 'other@example.com', name: 'Alice Smith' }] }))
        ).toBe(true)
    })
})

describe('From filter', () => {
    it('matches when from address contains the value', () => {
        const filter = From('bob')
        expect(filter.f(makeEmail({ from: { address: 'bob@example.com', name: '' } }))).toBe(true)
    })

    it('does not match when from is undefined', () => {
        const filter = From('bob')
        expect(filter.f(makeEmail({ from: undefined }))).toBe(false)
    })

    it('matches case-insensitively', () => {
        const filter = From('BOB')
        expect(filter.f(makeEmail({ from: { address: 'bob@example.com', name: '' } }))).toBe(true)
    })
})

describe('Body filter', () => {
    it('matches when textPreview contains the text', () => {
        const filter = Body('hello')
        expect(filter.f({ textPreview: 'say hello world' })).toBe(true)
    })

    it('does not match when textPreview does not contain the text', () => {
        const filter = Body('hello')
        expect(filter.f({ textPreview: 'goodbye' })).toBe(false)
    })

    it('does not match when textPreview is absent', () => {
        const filter = Body('hello')
        expect(filter.f({})).toBe(false)
    })

    it('matches case-insensitively', () => {
        const filter = Body('HELLO')
        expect(filter.f({ textPreview: 'say hello world' })).toBe(true)
    })
})

describe('parse', () => {
    it('returns null for strings without a colon', () => {
        expect(parse('nocolon')).toBeNull()
    })

    it('parses a subject label', () => {
        const label = parse('subject:hello')
        expect(label).not.toBeNull()
        expect(label!.type).toBe('subject')
        expect(label!.value).toBe('hello')
    })

    it('parses a to label', () => {
        const label = parse('to:alice')
        expect(label).not.toBeNull()
        expect(label!.type).toBe('to')
    })

    it('parses a from label', () => {
        const label = parse('from:bob')
        expect(label).not.toBeNull()
        expect(label!.type).toBe('from')
    })

    it('parses a body label with multi-word value', () => {
        const label = parse('body: foo bar')
        expect(label).not.toBeNull()
        expect(label!.type).toBe('body')
        expect(label!.value).toBe('foo bar')
    })

    it('returns null for unknown label types', () => {
        expect(parse('unknown:value')).toBeNull()
    })
})

describe('serialize / deserialize', () => {
    it('round-trips a To label', () => {
        const labels = [To('alice@example.com')]
        const result = deserialize(serialize(labels))
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe('to')
        expect(result[0].value).toBe('alice@example.com')
    })

    it('round-trips a From label', () => {
        const labels = [From('bob@example.com')]
        const result = deserialize(serialize(labels))
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe('from')
        expect(result[0].value).toBe('bob@example.com')
    })

    it('round-trips a Subject label', () => {
        const labels = [Subject('Important')]
        const result = deserialize(serialize(labels))
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe('subject')
        expect(result[0].value).toBe('Important')
    })

    it('round-trips multiple labels of different types', () => {
        const labels = [To('alice@example.com'), From('bob@example.com'), Subject('Hello')]
        const result = deserialize(serialize(labels))
        expect(result).toHaveLength(3)
        expect(result[0].type).toBe('to')
        expect(result[1].type).toBe('from')
        expect(result[2].type).toBe('subject')
    })

    it('reconstructed labels have working filter functions', () => {
        const email = makeEmail({ subject: 'Hello world' })
        const [label] = deserialize(serialize([Subject('Hello')]))
        expect(label.f(email)).toBe(true)
    })

    it('round-trips a Body label', () => {
        const labels = [Body('keyword')]
        const result = deserialize(serialize(labels))
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe('body')
        expect(result[0].value).toBe('keyword')
    })

    it('silently drops labels with unrecognized types', () => {
        const raw = JSON.stringify([
            { type: 'unknown', value: 'x' },
            { type: 'subject', value: 'keep' },
        ])
        const result = deserialize(raw)
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe('subject')
        expect(result[0].value).toBe('keep')
    })

    it('returns empty array for invalid JSON', () => {
        expect(deserialize('not json')).toEqual([])
    })

    it('returns empty array for non-array JSON', () => {
        expect(deserialize('"string"')).toEqual([])
    })
})
