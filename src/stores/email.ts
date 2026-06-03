import { defineStore } from 'pinia'
import type { EmailMeta } from '../parser'
import type { Label } from '../labels'
import { serialize, deserialize } from '../labels'
import { markAsRead } from '../cache'
import { useConfigStore } from './config'
import type { EffectiveBucketConfig } from '../config'

function bucketFilterKey(bucket: EffectiveBucketConfig): string {
    const id = bucket.prefix
        ? `${bucket.aws_region}:${bucket.bucket}:${bucket.prefix}`
        : `${bucket.aws_region}:${bucket.bucket}`
    return `filters:${id}`
}

export type IndexEntry = { s3Key: string; cacheKey: string }

export const useEmailStore = defineStore('email', {
    state: () => ({
        s3Index: [] as IndexEntry[],
        emailMeta: new Map<string, EmailMeta>(),
        labels: [] as Label[],
        readKeys: new Set<string>(),
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
        isRead(state): (key: string) => boolean {
            return (key: string) => state.readKeys.has(key)
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
            const bucket = useConfigStore().activeBucket
            if (bucket) localStorage[bucketFilterKey(bucket)] = serialize(this.labels)
        },
        removeLabel(label: Label) {
            this.labels = this.labels.filter((l) => l !== label)
            const bucket = useConfigStore().activeBucket
            if (bucket) localStorage[bucketFilterKey(bucket)] = serialize(this.labels)
        },
        loadPersistedFilters(bucketId: string) {
            const stored = localStorage[`filters:${bucketId}`] as string | undefined
            this.labels = stored ? deserialize(stored) : []
        },
        setReadKeys(keys: Set<string>) {
            this.readKeys = keys
        },
        async markRead(key: string) {
            this.readKeys.add(key)
            await markAsRead(key)
        },
    },
})
