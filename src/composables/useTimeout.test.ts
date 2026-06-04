import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useTimeout } from './useTimeout'

beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('useTimeout', () => {
    it('starts with running = false', () => {
        const { running } = useTimeout(1000)
        expect(running.value).toBe(false)
    })

    it('sets running = true immediately after start()', () => {
        const { running, start } = useTimeout(1000)
        start()
        expect(running.value).toBe(true)
    })

    it('sets running = false after the delay elapses', () => {
        const { running, start } = useTimeout(1000)
        start()
        vi.advanceTimersByTime(1000)
        expect(running.value).toBe(false)
    })

    it('calls the optional callback after the delay', () => {
        const cb = vi.fn()
        const { start } = useTimeout(500, cb)
        start()
        expect(cb).not.toHaveBeenCalled()
        vi.advanceTimersByTime(500)
        expect(cb).toHaveBeenCalledOnce()
    })

    it('restarting resets the delay', () => {
        const cb = vi.fn()
        const { start } = useTimeout(1000, cb)
        start()
        vi.advanceTimersByTime(800)
        start() // restart before it fires
        vi.advanceTimersByTime(800) // 800ms since restart, 1600 total — still shouldn't fire
        expect(cb).not.toHaveBeenCalled()
        vi.advanceTimersByTime(200) // now 1000ms since restart
        expect(cb).toHaveBeenCalledOnce()
    })
})
