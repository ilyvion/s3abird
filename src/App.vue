<template>
    <div class="drawer h-screen">
        <input id="menu-drawer" type="checkbox" class="drawer-toggle" />
        <div class="drawer-content flex h-screen flex-col">
            <Navbar />
            <div class="bg-base-200 container mx-auto flex-grow overflow-auto">
                <div class="bg-light rounded px-3 py-2">
                    <router-view v-slot="{ Component }">
                        <keep-alive include="EmailList">
                            <transition
                                name="fade"
                                mode="out-in"
                                enter-active-class="animate__animated animate__fadeInLeft animate__faster overflow-x-hidden"
                                leave-active-class="animate__animated animate__fadeOutRight animate__faster overflow-x-hidden"
                            >
                                <component :is="Component" />
                            </transition>
                        </keep-alive>
                    </router-view>
                </div>
            </div>
            <Footer />
        </div>

        <div class="drawer-side z-20 lg:hidden">
            <label for="menu-drawer" aria-label="close menu" class="drawer-overlay"></label>
            <div class="bg-base-300 h-screen w-[90%]"><Settings class="m-2 flex-col" /></div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import Settings from './Settings.vue'
import Navbar from './Navbar.vue'
import Footer from './Footer.vue'
import { watch } from 'vue'
import { useEffectiveTheme } from './useEffectiveTheme'

const { applyThemeToDocument } = useEffectiveTheme()
applyThemeToDocument()
</script>
<style scoped lang="css">
.container:has(.animate__fadeInLeft, .animate__fadeOutRight) {
    overflow-x: hidden;
}
</style>
