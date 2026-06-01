import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useEmailStore } from './email'
import type { ParsedEmail } from '../parser'

function makeEmail(key: string): ParsedEmail {
    return { key } as ParsedEmail
}

describe('email store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('starts with an empty emails map', () => {
        const store = useEmailStore()
        expect(store.emails.size).toBe(0)
    })

    it('updateEmails populates the store and keys by email.key', () => {
        const store = useEmailStore()
        store.updateEmails([makeEmail('a'), makeEmail('b')])
        expect(store.emails.size).toBe(2)
        expect(store.emails.has('a')).toBe(true)
        expect(store.emails.has('b')).toBe(true)
    })

    it('updateEmails replaces previous emails entirely', () => {
        const store = useEmailStore()
        store.updateEmails([makeEmail('old')])
        store.updateEmails([makeEmail('new1'), makeEmail('new2')])
        expect(store.emails.size).toBe(2)
        expect(store.emails.has('old')).toBe(false)
    })

    it('updateEmail updates a single entry without clearing others', () => {
        const store = useEmailStore()
        store.updateEmails([makeEmail('a'), makeEmail('b')])
        const updated = { key: 'a', subject: 'Updated' } as ParsedEmail
        store.updateEmail(updated)
        expect(store.emails.size).toBe(2)
        expect(store.emails.get('a')).toStrictEqual(updated)
    })

    it('filteredEmails returns all emails when no labels are active', () => {
        const store = useEmailStore()
        store.updateEmails([makeEmail('a'), makeEmail('b'), makeEmail('c')])
        expect(store.filteredEmails).toHaveLength(3)
    })

    it('filteredEmails applies label filters', () => {
        const store = useEmailStore()
        const a = { key: 'a', subject: 'Match' } as ParsedEmail
        const b = { key: 'b', subject: 'Other' } as ParsedEmail
        store.updateEmails([a, b])
        store.addLabel({ type: 'subject', value: 'Match', f: (e) => e.subject === 'Match' })
        expect(store.filteredEmails).toHaveLength(1)
        expect(store.filteredEmails[0].key).toBe('a')
    })

    it('removeLabel stops its filter from applying', () => {
        const store = useEmailStore()
        store.updateEmails([makeEmail('a'), makeEmail('b')])
        store.addLabel({ type: 'subject', value: '', f: () => false })
        expect(store.filteredEmails).toHaveLength(0)
        // retrieve the reactive reference so identity comparison inside removeLabel works
        const storedLabel = store.labels[0]
        store.removeLabel(storedLabel)
        expect(store.filteredEmails).toHaveLength(2)
    })
})
