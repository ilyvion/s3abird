<template>
    <select
        v-if="allBuckets.length > 1"
        v-model="activeIndex"
        class="select select-sm"
        aria-label="Active inbox"
    >
        <option v-for="(b, i) in allBuckets" :key="i" :value="i">
            {{ b.label || b.bucket }}
        </option>
    </select>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useConfigStore } from './stores/config'

const configStore = useConfigStore()

const allBuckets = computed(() => configStore.allBuckets)

const activeIndex = computed({
    get: () => configStore.activeBucketIndex,
    set: (val) => configStore.setActiveBucket(val),
})
</script>
