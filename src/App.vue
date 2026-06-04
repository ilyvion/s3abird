<template>
    <div class="drawer h-screen">
        <input id="menu-drawer" type="checkbox" class="drawer-toggle" />
        <div class="drawer-content flex h-screen flex-col">
            <Navbar />
            <div class="bg-base-200 container mx-auto flex-grow overflow-auto" tabindex="-1">
                <div class="bg-light rounded px-3 py-2">
                    <router-view v-slot="{ Component }">
                        <transition
                            name="fade"
                            mode="out-in"
                            enter-active-class="animate__animated animate__fadeInLeft animate__faster overflow-x-hidden"
                            leave-active-class="animate__animated animate__fadeOutRight animate__faster overflow-x-hidden"
                        >
                            <keep-alive include="EmailList">
                                <component :is="Component" />
                            </keep-alive>
                        </transition>
                    </router-view>
                </div>
            </div>
            <Footer />
        </div>

        <div v-if="!isSetupRoute" class="drawer-side z-20 lg:hidden">
            <label for="menu-drawer" aria-label="close menu" class="drawer-overlay" />
            <div class="bg-base-300 h-screen w-[90%]">
                <BucketSelector class="m-2" />
                <Settings class="m-2 flex-col" />
            </div>
        </div>
    </div>

    <KeyboardShortcutsModal v-model="showShortcutsModal" />
</template>
<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import Settings from './AwsSettings.vue'
import BucketSelector from './BucketSelector.vue'
import Navbar from './MainNavbar.vue'
import Footer from './MainFooter.vue'
import KeyboardShortcutsModal from './KeyboardShortcutsModal.vue'
import { useEffectiveTheme } from './useEffectiveTheme'
import { useKeyboardShortcutsModal } from './useKeyboardShortcutsModal.js'

const route = useRoute()
const isSetupRoute = computed(() => route.path === '/setup' || route.path === '/setup/add')

const { applyThemeToDocument, dispose } = useEffectiveTheme()
applyThemeToDocument()
onBeforeUnmount(dispose)

const { showShortcutsModal } = useKeyboardShortcutsModal()

function handleKeyDown(e: KeyboardEvent) {
    if (showShortcutsModal.value) return
    const el = document.activeElement
    const isInput =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable)
    if (isInput) return
    if (e.key === '?') {
        showShortcutsModal.value = true
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown)
})
</script>
<style scoped lang="css">
.container:has(.animate__fadeInLeft, .animate__fadeOutRight) {
    overflow-x: hidden;
}
</style>
