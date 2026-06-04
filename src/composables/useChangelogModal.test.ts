import { describe, it, expect } from 'vitest'
import { useChangelogModal } from './useChangelogModal.js'

describe('useChangelogModal', () => {
    it('starts closed', () => {
        const { showChangelogModal } = useChangelogModal()
        expect(showChangelogModal.value).toBe(false)
    })

    it('opens and closes the modal', () => {
        const { showChangelogModal, openModal, closeModal } = useChangelogModal()
        openModal()
        expect(showChangelogModal.value).toBe(true)
        closeModal()
        expect(showChangelogModal.value).toBe(false)
    })
})
