<template>
    <div class="not-prose mt-6">
        <div class="divider text-sm">Connection Test</div>
        <p class="mb-3 text-sm">
            Before finishing, verify that the s3abird can successfully access the bucket. This is
            required to succeed before the Finish button becomes available.
        </p>
        <div class="flex flex-wrap items-center gap-3">
            <button
                class="btn btn-neutral"
                :disabled="disabled || status === 'testing'"
                @click="$emit('test')"
            >
                <span v-if="status === 'testing'" class="loading loading-spinner loading-sm" />
                {{ status === 'testing' ? 'Testing…' : 'Test Connection' }}
            </button>
            <span v-if="status === 'success'" class="text-success font-medium">
                ✔ Connection successful — credentials are valid
            </span>
        </div>
        <div v-if="status === 'error'" class="alert alert-error mt-3">
            <div>
                <div class="font-bold">Connection failed</div>
                <div class="text-sm break-all">{{ error }}</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
defineProps<{
    disabled: boolean
    status: TestStatus
    error: string
}>()

defineEmits<{
    test: []
}>()
</script>

<script lang="ts">
export type TestStatus = 'idle' | 'testing' | 'success' | 'error'
</script>
