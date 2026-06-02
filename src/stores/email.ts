import { defineStore } from 'pinia'
import type { EmailMeta } from '../parser'
import type { Label } from '../labels'

export type IndexEntry = { s3Key: string; cacheKey: string }

export const useEmailStore = defineStore('email', {
    state: () => ({
        s3Index: [] as IndexEntry[],
        emailMeta: new Map<string, EmailMeta>(),
        labels: [] as Label[],
    }),
    getters: {
        filteredIndex(state): IndexEntry[] {
            if (state.labels.length === 0) return state.s3Index
            return state.s3Index.filter(({ cacheKey }) => {
                const meta = state.emailMeta.get(cacheKey)
                if (!meta) return true
                return state.labels.every((label) => label.f(meta))
            })
        },
    },
    actions: {
        setS3Index(items: IndexEntry[]) {
            this.s3Index = items
        },
        addEmailMeta(meta: EmailMeta) {
            this.emailMeta.set(meta.key, meta)
        },
        setEmailMetas(metas: EmailMeta[]) {
            const map = new Map<string, EmailMeta>()
            metas.forEach((m) => map.set(m.key, m))
            this.emailMeta = map
        },
        addLabel(label: Label) {
            this.labels.push(label)
        },
        removeLabel(label: Label) {
            this.labels = this.labels.filter((l) => l !== label)
        },
    },
})
