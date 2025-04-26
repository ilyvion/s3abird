<template>
    <div class="group ms-2 flex gap-2">
        <button
            class="cursor-pointer"
            :class="{
                'text-yellow-500 drop-shadow drop-shadow-yellow-400/75': effectiveTheme === 'light',
            }"
            aria-label="Set light theme"
            title="Set light theme"
            @click="themeStore.updateTheme('light')"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="12" cy="12" r="5" />
                <path
                    d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
                />
            </svg>
        </button>
        <input
            ref="themeToggle"
            type="checkbox"
            class="toggle"
            aria-label="Toggle theme"
            :title="'Current theme: ' + themeStore.theme + ', next theme: ' + themeStore.nextTheme"
            @change="themeStore.cycleTheme"
        />
        <button
            class="cursor-pointer"
            :class="{
                'text-cyan-700 inset-shadow-zinc-950 drop-shadow drop-shadow-cyan-400/75 dark:text-cyan-500':
                    effectiveTheme === 'dark',
            }"
            aria-label="Set dark theme"
            title="Set dark theme"
            @click="themeStore.updateTheme('dark')"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
        </button>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useThemeStore } from './stores/theme'
import { useThreeStateCheckbox } from './useThreeStateCheckbox'
import { useEffectiveTheme } from './useEffectiveTheme'

const themeStore = useThemeStore()
const { effectiveTheme } = useEffectiveTheme()

const themeToggle = ref<HTMLInputElement | null>(null)
useThreeStateCheckbox(themeToggle, () => themeStore.theme, {
    isChecked: (theme) => theme === 'dark',
    isIndeterminate: (theme) => theme === 'system',
})
</script>
