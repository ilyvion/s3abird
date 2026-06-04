<template>
    <div class="flex flex-col items-center justify-center py-20 text-center">
        <h1 class="text-6xl font-bold opacity-30">404</h1>
        <p class="mt-4 text-xl">Page not found</p>
        <p class="text-base-content/60 mt-2">
            <RouterLink to="/" class="link">Go to inbox</RouterLink>
        </p>
    </div>
</template>
<script lang="ts" setup>
import { useHead } from '@unhead/vue'

useHead({ meta: [{ name: 'robots', content: 'noindex' }] })
</script>
