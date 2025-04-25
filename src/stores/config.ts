import { defineStore } from 'pinia'
import type { AwsConfig } from '../config'
import { clearEmailCache } from '../cache'

export const useConfigStore = defineStore('config', {
    state: () => ({
        config: JSON.parse(localStorage.config || 'null') as AwsConfig | null,
    }),
    actions: {
        updateConfig(newConfig: AwsConfig) {
            const oldConfig = this.config
            this.config = newConfig
            localStorage.config = JSON.stringify(newConfig)

            if (JSON.stringify(oldConfig) !== JSON.stringify(newConfig)) {
                clearEmailCache()
            }
        },
    },
})
