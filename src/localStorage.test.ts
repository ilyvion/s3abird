// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'

describe('localStorage module', () => {
    beforeEach(() => {
        localStorage.clear()
    })

    describe('without prefix', () => {
        let lsGetItem: (key: string) => string | null
        let lsSetItem: (key: string, value: string) => void
        let lsRemoveItem: (key: string) => void

        beforeAll(async () => {
            vi.resetModules()
            const mod = await import('./localStorage.js')
            lsGetItem = mod.getItem
            lsSetItem = mod.setItem
            lsRemoveItem = mod.removeItem
        })

        afterAll(() => {
            vi.resetModules()
        })

        it('stores and retrieves a value under the bare key', () => {
            lsSetItem('foo', 'bar')
            expect(localStorage.getItem('foo')).toBe('bar')
            expect(lsGetItem('foo')).toBe('bar')
        })

        it('returns null for a missing key', () => {
            expect(lsGetItem('missing')).toBeNull()
        })

        it('removes the key', () => {
            lsSetItem('foo', 'bar')
            lsRemoveItem('foo')
            expect(lsGetItem('foo')).toBeNull()
        })
    })

    describe('with VITE_STORAGE_PREFIX', () => {
        let lsGet: (key: string) => string | null
        let lsSet: (key: string, value: string) => void
        let lsRemove: (key: string) => void

        beforeAll(async () => {
            vi.resetModules()
            vi.stubEnv('VITE_STORAGE_PREFIX', 'dev')
            const mod = await import('./localStorage.js')
            lsGet = mod.getItem
            lsSet = mod.setItem
            lsRemove = mod.removeItem
            vi.unstubAllEnvs()
        })

        afterAll(() => {
            vi.resetModules()
        })

        it('stores values under the prefixed key', () => {
            lsSet('foo', 'bar')
            expect(localStorage.getItem('dev:foo')).toBe('bar')
        })

        it('retrieves values from the prefixed key', () => {
            localStorage.setItem('dev:foo', 'bar')
            expect(lsGet('foo')).toBe('bar')
        })

        it('does not see values stored under the bare key', () => {
            localStorage.setItem('foo', 'bare')
            expect(lsGet('foo')).toBeNull()
        })

        it('removes the prefixed key', () => {
            lsSet('foo', 'bar')
            lsRemove('foo')
            expect(localStorage.getItem('dev:foo')).toBeNull()
        })
    })
})
