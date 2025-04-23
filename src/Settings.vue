<template>
    <form class="flex gap-2" @submit.prevent="updateConfig">
        <label class="floating-label">
            <input
                class="input"
                placeholder="AWS Region"
                aria-label="AWS Region"
                v-model="config.aws_region"
            />
            <span>AWS Region</span>
        </label>
        <label class="floating-label">
            <input class="input" placeholder="S3 Bucket" aria-label="S3 Bucket" v-model="bucket" />
            <span>S3 Bucket</span>
        </label>
        <label class="floating-label">
            <input
                class="input"
                type="password"
                placeholder="AWS Access Key Id"
                aria-label="AWS Access Key Id"
                v-model="config.aws_access_key_id"
            />
            <span>AWS Access Key Id</span>
        </label>
        <label class="floating-label">
            <input
                class="input"
                type="password"
                placeholder="AWS Secret Access Key"
                aria-label="AWS Secret Access Key"
                v-model="config.aws_secret_access_key"
            />
            <span>AWS Access Key Id</span>
        </label>
        <button class="btn btn-primary" type="submit">Save config</button>
    </form>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useStore } from 'vuex'
import { key, type State } from './store'

const store = useStore(key)

// Make a reactive copy of the Vuex config
const config = reactive({ ...store.state.config })

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
    store.commit('updateConfig', { ...config })
}
</script>
