<template>
    <div class="not-prose relative my-4">
        <pre class="bg-base-300 overflow-x-auto rounded p-4 pr-24 text-sm">{{ json }}</pre>
        <button class="btn btn-primary btn-sm absolute top-2 right-2" @click="copy">
            {{ copied ? 'Copied!' : 'Copy' }}
        </button>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useTimeout } from '../composables/useTimeout'

const props = defineProps<{
    json: string
}>()

const copyTimeout = useTimeout(3000)
const copied = computed(() => copyTimeout.running.value)

function copy() {
    copyTimeout.start()
    void navigator.clipboard.writeText(props.json)
}
</script>
