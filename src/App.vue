<template>
    <div class="drawer h-screen">
        <input id="menu-drawer" ref="drawerCheckbox" type="checkbox" class="drawer-toggle" />
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

        <div v-if="!isFirstSetupRoute" class="drawer-side z-20 lg:hidden">
            <label for="menu-drawer" aria-label="close menu" class="drawer-overlay" />
            <div class="bg-base-300 flex h-screen w-[90%] flex-col gap-3 p-4">
                <BucketSelector
                    v-if="hasMultipleBuckets && !isSetupRoute"
                    class="w-full"
                    @change="closeDrawer"
                />
                <div v-if="hasMultipleBuckets" class="divider my-0" />
                <Settings class="w-full justify-start text-base" @click="closeDrawer" />
            </div>
        </div>
    </div>

    <KeyboardShortcutsModal v-model="showShortcutsModal" />
    <ChangelogModal v-model="showChangelogModal" />
</template>
<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import Settings from './AwsSettings.vue'
import BucketSelector from './BucketSelector.vue'
import Navbar from './MainNavbar.vue'
import Footer from './MainFooter.vue'
import KeyboardShortcutsModal from './KeyboardShortcutsModal.vue'
import ChangelogModal from './ChangelogModal.vue'
import { useEffectiveTheme } from './composables/useEffectiveTheme'
import { useKeyboardShortcutsModal } from './composables/useKeyboardShortcutsModal.js'
import { useChangelogModal } from './composables/useChangelogModal.js'
import { useConfigStore } from './stores/config'

const drawerCheckbox = ref<HTMLInputElement | null>(null)
function closeDrawer() {
    if (drawerCheckbox.value) drawerCheckbox.value.checked = false
}

const route = useRoute()
const configStore = useConfigStore()
const isFirstSetupRoute = computed(() => route.path === '/setup')
const isSetupRoute = computed(() => route.path.startsWith('/setup'))
const hasMultipleBuckets = computed(() => configStore.allBuckets.length > 1)

const { applyThemeToDocument, dispose } = useEffectiveTheme()
applyThemeToDocument()
onBeforeUnmount(dispose)

const { showShortcutsModal } = useKeyboardShortcutsModal()
const { showChangelogModal } = useChangelogModal()

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
