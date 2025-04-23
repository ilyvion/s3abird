<template>
    <span>{{ formattedAddress }}</span>
</template>

<script lang="ts" setup>
import type { Address } from 'postal-mime'
import { computed } from 'vue'

const props = defineProps<{
    address: Address
}>()

const formattedAddress = computed(() => {
    const a = props.address || {}
    return `${a.name || ''} ${a.address ? `<${a.address}>` : ''}`
})
</script>
