import { defineStore } from 'pinia'
import type { AwsConfig, EffectiveBucketConfig } from '../config'
import { migrateLegacyConfig, flattenBuckets } from '../config'
import { clearEmailCache } from '../cache'

function safeParseJson(s: string | undefined): unknown {
    try {
        return JSON.parse(s || 'null')
    } catch {
        return null
    }
}

export const useConfigStore = defineStore('config', {
    state: () => ({
        config: migrateLegacyConfig(safeParseJson(localStorage.config)) as AwsConfig | null,
        activeBucketIndex: parseInt(localStorage.activeBucketIndex || '0', 10),
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
