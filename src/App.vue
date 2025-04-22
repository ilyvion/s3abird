<script lang="ts" setup>
import Settings from './Settings.vue'
import Navbar from './Navbar.vue'
</script>
<template>
    <div class="drawer h-screen">
        <input id="menu-drawer" type="checkbox" class="drawer-toggle" />
        <div class="drawer-content flex h-screen flex-col">
            <Navbar />
            <div class="bg-base-200 container mx-auto overflow-scroll">
                <div class="bg-light rounded px-3 py-2">
                    <router-view v-slot="{ Component }">
                        <keep-alive include="EmailList">
                            <transition
                                name="fade"
                                mode="out-in"
                                enter-active-class="animate__animated animate__fadeInLeft animate__faster"
                                leave-active-class="animate__animated animate__fadeOutRight animate__faster"
                            >
                                <component :is="Component" />
                            </transition>
                        </keep-alive>
                    </router-view>
                </div>
            </div>
            <footer
                class="bg-accent text-accent-content border-t-accent-content/30 container flex flex-row justify-between gap-2 border-t p-2 text-xs md:px-6"
            >
                <div class="flex flex-col gap-2">
                    <span
                        >Current version maintained with <i class="fas fa-heart"></i> by
                        <a class="link" href="https://alexanderschroeder.net/"
                            >Alexander&nbsp;Krivács&nbsp;Schrøder</a
                        ></span
                    >
                    <span>
                        Original made with <i class="fas fa-heart"></i> by
                        <a class="link" href="https://marcinchmiel.com">Marcin&nbsp;Chmiel</a>
                    </span>
                </div>
                <div>
                    <a class="link flex items-center" href="https://github.com/ilyvion/s3abird"
                        ><i class="fab fa-github"></i>&nbsp;Contribute</a
                    >
                </div>
            </footer>
        </div>

        <div class="drawer-side z-20 lg:hidden">
            <label for="menu-drawer" aria-label="close menu" class="drawer-overlay"></label>
            <div class="bg-base-300 h-screen w-[90%]"><Settings class="m-2 flex-col" /></div>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    name: 'App',
}
</script>
