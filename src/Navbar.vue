<template>
    <nav class="navbar bg-base-200 border-b border-neutral-300 shadow-md">
        <h1 class="flex-1">
            <router-link class="mx-2 text-3xl font-semibold" to="/">s3abird</router-link>
        </h1>
        <!-- TODO: Replace this with proper AWS login -->
        <div class="navbar-end lg:flex">
            <label for="menu-drawer" aria-label="close menu" class="lg:hidden"
                ><i class="fas fa-bars text-2xl"></i
            ></label>
            <Settings class="max-md:hidden" />
        </div>
    </nav>
</template>

<script lang="ts" setup>
import Settings from './Settings.vue'
</script>
