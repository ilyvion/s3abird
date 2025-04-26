<template>
    <nav class="navbar bg-base-300 border-b border-neutral-300">
        <div class="navbar-start w-[unset] flex-grow">
            <h1>
                <router-link class="mx-2 text-3xl font-semibold" to="/"> s3abird </router-link>
            </h1>
            <ThemeController />
        </div>
        <!-- TODO: Replace this with proper AWS login -->
        <div class="navbar-end w-[unset] flex-shrink lg:flex">
            <label for="menu-drawer" aria-label="close menu" class="p-2 lg:hidden"
                ><i class="fas fa-bars text-2xl"
            /></label>
            <Settings class="max-md:hidden" />
        </div>
    </nav>
</template>

<script lang="ts" setup>
import Settings from './AwsSettings.vue'
import ThemeController from './ThemeController.vue'
</script>
