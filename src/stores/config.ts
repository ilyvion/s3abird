import { defineStore } from 'pinia'
import type { AwsConfig, EffectiveBucketConfig } from '../config'
import { migrateLegacyConfig, flattenBuckets } from '../config'
import { clearEmailCacheForBuckets } from '../cache'
import { clearS3ClientCache } from '../s3Utils'
import { getItem as lsGetItem, setItem as lsSetItem } from '../localStorage'

function parseStoredConfig(s: string | null): AwsConfig | null {
    try {
        return migrateLegacyConfig(JSON.parse(s || 'null'))
    } catch {
        return null
    }
}

export const useConfigStore = defineStore('config', {
    state: () => ({
        config: parseStoredConfig(lsGetItem('config')),
        activeBucketIndex: parseInt(lsGetItem('activeBucketIndex') || '0', 10),
    }),
    getters: {
        allBuckets: (state): EffectiveBucketConfig[] => {
            if (!state.config) return []
            return flattenBuckets(state.config)
        },
        activeBucket(): EffectiveBucketConfig | null {
            const buckets = this.allBuckets
            if (buckets.length === 0) return null
            const idx = Math.min(this.activeBucketIndex, buckets.length - 1)
            return buckets[idx] ?? null
        },
    },
    actions: {
        updateConfig(newConfig: AwsConfig) {
            const oldConfig = this.config
            this.config = newConfig
            lsSetItem('config', JSON.stringify(newConfig))

            const newBuckets = flattenBuckets(newConfig)
            if (this.activeBucketIndex >= newBuckets.length) {
                this.activeBucketIndex = Math.max(0, newBuckets.length - 1)
                lsSetItem('activeBucketIndex', String(this.activeBucketIndex))
            }

            const oldBuckets = oldConfig ? flattenBuckets(oldConfig) : []
            const newSigs = new Set(
                newBuckets.map(
                    (b) =>
                        `${b.aws_region}|${b.bucket}|${b.prefix ?? ''}|${b.aws_access_key_id}|${b.aws_secret_access_key}`
                )
            )
            const staleBuckets = oldBuckets.filter(
                (b) =>
                    !newSigs.has(
                        `${b.aws_region}|${b.bucket}|${b.prefix ?? ''}|${b.aws_access_key_id}|${b.aws_secret_access_key}`
                    )
            )
            if (staleBuckets.length > 0) {
                void clearEmailCacheForBuckets(staleBuckets)
            }

            const newCredSigs = new Set(
                newConfig.credentials.map(
                    (c) => `${c.aws_access_key_id}|${c.aws_secret_access_key}`
                )
            )
            const existingCredRemoved = (oldConfig?.credentials ?? []).some(
                (c) => !newCredSigs.has(`${c.aws_access_key_id}|${c.aws_secret_access_key}`)
            )
            if (existingCredRemoved) {
                clearS3ClientCache()
            }
        },
        setActiveBucket(index: number) {
            this.activeBucketIndex = index
            lsSetItem('activeBucketIndex', String(index))
        },
    },
})
