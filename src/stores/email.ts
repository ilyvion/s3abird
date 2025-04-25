import { defineStore } from 'pinia'
import type { ParsedEmail } from '../parser'
import type { Label } from '../labels'

export const useEmailStore = defineStore('email', {
    state: () => ({
        emails: new Map<string, ParsedEmail>(),
        labels: [] as Label[],
    }),
    getters: {
        filteredEmails: (state) => {
            let result: ParsedEmail[] = []
            state.emails.forEach((email) => result.push(email))
            state.labels.forEach((label) => {
                result = result.filter(label.f)
            })
            return result
        },
    },
    actions: {
        updateEmails(emails: ParsedEmail[]) {
            const map = new Map<string, ParsedEmail>()
            emails.forEach((email) => map.set(email.key, email))
            this.emails = map
        },
        updateEmail(email: ParsedEmail) {
            this.emails.set(email.key, email)
        },
        addLabel(label: Label) {
            this.labels.push(label)
        },
        removeLabel(label: Label) {
            this.labels = this.labels.filter((l) => l !== label)
        },
    },
})
