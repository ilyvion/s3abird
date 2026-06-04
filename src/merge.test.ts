import { describe, it, expect } from 'vitest'
import { mergeWithDefaults } from './merge'

describe('mergeWithDefaults', () => {
    it('uses prop value when prop is defined', () => {
        const result = mergeWithDefaults({ a: 'prop' }, { a: 'default' })
        expect(result.a).toBe('prop')
    })

    it('falls back to default when prop is undefined', () => {
        const result = mergeWithDefaults({ a: undefined as string | undefined }, { a: 'default' })
        expect(result.a).toBe('default')
    })

    it('includes keys only in defaults', () => {
        const result = mergeWithDefaults({} as { b?: string }, { b: 'default' })
        expect(result.b).toBe('default')
    })

    it('includes keys only in props', () => {
        const result = mergeWithDefaults({ c: 'prop' }, {})
        expect(result.c).toBe('prop')
    })

    it('composes two function props so both must return true', () => {
        let propCalled = false
        let defaultCalled = false

        const result = mergeWithDefaults(
            {
                fn: () => {
                    propCalled = true
                    return true
                },
            },
            {
                fn: () => {
                    defaultCalled = true
                    return true
                },
            }
        )

        expect(result.fn()).toBe(true)
        expect(propCalled).toBe(true)
        expect(defaultCalled).toBe(true)
    })

    it('composed function returns false when default fn returns false', () => {
        const result = mergeWithDefaults({ fn: () => true }, { fn: () => false })
        expect(result.fn()).toBe(false)
    })

    it('composed function returns false when prop fn returns false', () => {
        const result = mergeWithDefaults({ fn: () => false }, { fn: () => true })
        expect(result.fn()).toBe(false)
    })
})
