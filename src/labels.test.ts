import { describe, it, expect } from 'vitest'
import type { Email } from 'postal-mime'
import { To, From, Subject, parse } from './labels'

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

    it('returns null for unknown label types', () => {
        expect(parse('unknown:value')).toBeNull()
    })
})
