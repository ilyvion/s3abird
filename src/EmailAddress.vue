<template>
    <span>{{ formattedAddress }}</span>
</template>
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
    name: 'EmailAddress',
    props: {
        address: {
            type: Object,
            required: true,
        },
    },
    computed: {
        formattedAddress() {
            const a = this.address || {}
            return `${a.name || ''} ${a.address ? `<${a.address}>` : ''}`
        },
    },
})
</script>
