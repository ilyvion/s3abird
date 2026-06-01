import { defineStore } from 'pinia'
import type { AwsConfig, EffectiveBucketConfig } from '../config'
import { migrateLegacyConfig, flattenBuckets } from '../config'
import { clearEmailCache } from '../cache'

export const useConfigStore = defineStore('config', {
    state: () => ({
        config: migrateLegacyConfig(JSON.parse(localStorage.config || 'null')) as AwsConfig | null,
        activeBucketIndex: parseInt(localStorage.activeBucketIndex || '0', 10),
    }),
    getters: {
        allBuckets: (state): EffectiveBucketConfig[] => {
            if (!state.config) return []
            return flattenBuckets(state.config)
        },
        activeBucket(state): EffectiveBucketConfig | null {
            const buckets = state.config ? flattenBuckets(state.config) : []
            if (buckets.length === 0) return null
            const idx = Math.min(state.activeBucketIndex, buckets.length - 1)
            return buckets[idx] ?? null
        },
    },
    actions: {
        updateConfig(newConfig: AwsConfig) {
            const oldConfig = this.config
            this.config = newConfig
            localStorage.config = JSON.stringify(newConfig)

            const newTotal = flattenBuckets(newConfig).length
            if (this.activeBucketIndex >= newTotal) {
                this.activeBucketIndex = Math.max(0, newTotal - 1)
                localStorage.activeBucketIndex = String(this.activeBucketIndex)
            }

            if (JSON.stringify(oldConfig) !== JSON.stringify(newConfig)) {
                clearEmailCache()
            }
        },
        setActiveBucket(index: number) {
            this.activeBucketIndex = index
            localStorage.activeBucketIndex = String(index)
        },
    },
})
