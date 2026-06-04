import { describe, it, expect, beforeEach, vi } from 'vitest'

beforeEach(() => {
    vi.resetModules()
})

describe('useKeyboardShortcutsModal', () => {
    it('openModal sets showShortcutsModal to true', async () => {
        const { useKeyboardShortcutsModal } = await import('./useKeyboardShortcutsModal')
        const { showShortcutsModal, openModal } = useKeyboardShortcutsModal()
        openModal()
        expect(showShortcutsModal.value).toBe(true)
    })

    it('closeModal sets showShortcutsModal to false', async () => {
        const { useKeyboardShortcutsModal } = await import('./useKeyboardShortcutsModal')
        const { showShortcutsModal, openModal, closeModal } = useKeyboardShortcutsModal()
        openModal()
        closeModal()
        expect(showShortcutsModal.value).toBe(false)
    })

    it('state is shared between multiple calls to useKeyboardShortcutsModal', async () => {
        const { useKeyboardShortcutsModal } = await import('./useKeyboardShortcutsModal')
        const a = useKeyboardShortcutsModal()
        const b = useKeyboardShortcutsModal()
        a.openModal()
        expect(b.showShortcutsModal.value).toBe(true)
    })
})
