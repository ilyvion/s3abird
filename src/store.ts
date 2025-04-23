// store.ts
import type { InjectionKey } from 'vue'
import { createStore, Store } from 'vuex'
import type { ParsedEmail } from './parser'
import type { Label } from './labels'
import type { AwsConfig } from './config'
import { clearEmailCache } from './cache'

// define your typings for the store state
export interface State {
    config: AwsConfig | null
    emails: Map<string, ParsedEmail>
    labels: Array<Label>
}

// define injection key
export const key: InjectionKey<Store<State>> = Symbol()

export const store = createStore<State>({
    state: {
        config: JSON.parse(localStorage.config || null),
        emails: new Map(),
        labels: [],
    },
    getters: {
        emails: (state) => {
            let emails: ParsedEmail[] = []
            state.emails.forEach((v) => emails.push(v))
            state.labels.forEach((label) => {
                emails = emails.filter(label.f)
            })
            return emails
        },
    },
    mutations: {
        updateConfig(state, newConfig: AwsConfig) {
            const oldConfig = state.config
            state.config = newConfig
            localStorage.config = JSON.stringify(newConfig)

            // If the config has changed, clear the email cache
            if (JSON.stringify(oldConfig) !== JSON.stringify(newConfig)) {
                clearEmailCache()
            }
        },
        updateEmails(state, emails: ParsedEmail[]) {
            const map = new Map()
            emails.forEach((email) => {
                map.set(email.key, email)
            })
            state.emails = map
        },
        updateEmail(state, email: ParsedEmail) {
            state.emails.set(email.key, email)
        },
        addLabel(state, label: Label) {
            state.labels.push(label)
        },
        removeLabel(state, label: Label) {
            state.labels = state.labels.filter((l) => l !== label)
        },
    },
})
