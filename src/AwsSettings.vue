<template>
    <form class="flex gap-4 md:gap-2" @submit.prevent="updateConfig">
        <label class="floating-label">
            <input
                v-model="config.aws_region"
                class="input"
                placeholder="AWS Region"
                aria-label="AWS Region"
            />
            <span>AWS Region</span>
        </label>
        <label class="floating-label">
            <input v-model="bucket" class="input" placeholder="S3 Bucket" aria-label="S3 Bucket" />
            <span>S3 Bucket</span>
        </label>
        <label class="floating-label">
            <input
                v-model="config.aws_access_key_id"
                class="input"
                type="password"
                placeholder="AWS Access Key Id"
                aria-label="AWS Access Key Id"
            />
            <span>AWS Access Key Id</span>
        </label>
        <label class="floating-label">
            <input
                v-model="config.aws_secret_access_key"
                class="input"
                type="password"
                placeholder="AWS Secret Access Key"
                aria-label="AWS Secret Access Key"
            />
            <span>AWS Access Key Id</span>
        </label>
        <button class="btn btn-primary" type="submit">Save config</button>
    </form>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useConfigStore } from './stores/config'

const configStore = useConfigStore()

// Make a reactive copy of the state config
const config = reactive({ ...configStore.config })

// Two-way computed "bucket" property
const bucket = computed({
    get() {
        return config.prefix ? `${config.bucket}/${config.prefix}` : config.bucket
    },
    set(val: string) {
        const [bucketName, prefix] = val.split(/\/(.+)/)
        config.bucket = bucketName
        config.prefix = prefix
    },
})

function updateConfig() {
    // TODO: Validate the config and use ValidatedAwsConfig
    configStore.updateConfig({ ...config })
}
</script>
